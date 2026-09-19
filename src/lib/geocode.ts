import { readFile } from "node:fs/promises";
import path from "node:path";
import type { StructuredReport } from "./schemas";
import { extractPlaceNames, extractStreetNames, intersectionKeys, normalizeStreetName } from "./street-names.ts";
import { isInToronto, TORONTO_BOUNDS, type Coordinates } from "./toronto-bounds.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
// Built from the City of Toronto centreline intersection file by `npm run intersections:update`.
const INTERSECTIONS_FILE = path.join(process.cwd(), "data", "toronto-intersections.json");
const MAX_STREETS_PAIRED = 4;
const MAX_NAME_EXPANSIONS = 8;

// Pair key (see intersectionKeys) -> [latitude, longitude].
export type IntersectionIndex = Record<string, [number, number]>;

let intersectionIndex: Promise<IntersectionIndex> | undefined;

function loadIntersectionIndex(): Promise<IntersectionIndex> {
  intersectionIndex ??= readFile(INTERSECTIONS_FILE, "utf8")
    .then((text) => (JSON.parse(text) as { entries: IntersectionIndex }).entries)
    .catch(() => ({}));
  return intersectionIndex;
}

function toTorontoCoordinates(lat: unknown, lon: unknown): Coordinates | null {
  const coordinates = { latitude: Number(lat), longitude: Number(lon) };
  if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) return null;
  return isInToronto(coordinates) ? coordinates : null;
}

function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function streetNamePattern(street: string): string {
  const base = street.replace(/\s+(East|West|North|South)$/i, "");
  return `^${escapeOverpassRegex(base)}( (East|West|North|South))?$`;
}

async function searchOverpassIntersection(streets: string[]): Promise<Coordinates | null> {
  if (streets.length < 2) return null;
  const first = streetNamePattern(streets[0]);
  const second = streetNamePattern(streets[1]);
  const query = `[out:json][timeout:8];
area["name"="Toronto"]["boundary"="administrative"]->.searchArea;
way(area.searchArea)["highway"]["name"~"${first}",i]->.a;
way(area.searchArea)["highway"]["name"~"${second}",i]->.b;
node(w.a)(w.b);
out 1;`;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { elements?: { lat?: number; lon?: number }[] };
    const hit = body.elements?.find((element) => element.lat !== undefined && element.lon !== undefined);
    return hit ? toTorontoCoordinates(hit.lat, hit.lon) : null;
  } catch {
    return null;
  }
}

const streetNamesByIndex = new WeakMap<IntersectionIndex, string[]>();

function streetNamesIn(index: IntersectionIndex): string[] {
  let names = streetNamesByIndex.get(index);
  if (!names) {
    names = [...new Set(Object.keys(index).flatMap((key) => key.split("&")))].sort();
    streetNamesByIndex.set(index, names);
  }
  return names;
}

// A spoken name plus the city streets it is short for: "queens park" -> "queens park cres e", "queens park cres w"...
function nameVariants(name: string, index: IntersectionIndex): string[] {
  const longer = streetNamesIn(index).filter((street) => street.startsWith(`${name} `));
  return [name, ...longer.slice(0, MAX_NAME_EXPANSIONS)];
}

// Finds where two of the named streets meet, trying the first two first and then the other pairs.
export function lookupIntersection(streets: string[], index: IntersectionIndex): Coordinates | null {
  const names = [...new Set(streets.map(normalizeStreetName))].filter(Boolean).slice(0, MAX_STREETS_PAIRED);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const a of nameVariants(names[i], index)) {
        for (const b of nameVariants(names[j], index)) {
          for (const key of intersectionKeys(a, b)) {
            const point = index[key];
            if (point) return toTorontoCoordinates(point[0], point[1]);
          }
        }
      }
    }
  }
  return null;
}

async function searchNominatim(query: string): Promise<Coordinates | null> {
  const { west, south, east, north } = TORONTO_BOUNDS;
  // Conversational descriptions such as "Queen's Park, right outside of Hart House"
  // are too verbose for Nominatim. The named landmark is the most precise searchable part.
  const outsideLandmark = query.match(/\b(?:right\s+)?outside(?:\s+of)?\s+(?:the\s+)?(.+)$/i)?.[1];
  const searchableQuery = outsideLandmark?.trim() || query;
  const params = new URLSearchParams({
    q: `${searchableQuery}, Toronto, Ontario`,
    format: "jsonv2",
    limit: "1",
    countrycodes: "ca",
    viewbox: `${west},${north},${east},${south}`,
    bounded: "1",
  });
  const contact = process.env.GEOCODER_CONTACT_EMAIL;
  try {
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "User-Agent": `Relay311/0.1${contact ? ` (${contact})` : ""}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const [hit] = (await response.json()) as { lat?: string; lon?: string }[];
    return hit ? toTorontoCoordinates(hit.lat, hit.lon) : null;
  } catch {
    return null;
  }
}

// Resolves a caller-described location to coordinates inside Toronto: street intersections
// ("Yonge Street near Eglinton Avenue", "Queens Park on Wellesley Street West") from the city's
// intersection file, everything else via Nominatim.
// Never throws: a failed lookup just leaves the incident unplotted.
export async function geocodeToronto(raw: string): Promise<Coordinates | null> {
  const query = raw.trim();
  if (!query) return null;

  const streets = extractStreetNames(query);
  // Suffixed streets go first so an unrecognised capitalised word never displaces a real street pair.
  const candidates = [...streets, ...extractPlaceNames(query)];
  if (candidates.length >= 2) {
    const intersection = lookupIntersection(candidates, await loadIntersectionIndex());
    if (intersection) return intersection;
  }
  if (streets.length >= 2) {
    const onlineIntersection = await searchOverpassIntersection(streets);
    if (onlineIntersection) return onlineIntersection;
  }
  return searchNominatim(query);
}

export async function withCoordinates(report: StructuredReport): Promise<StructuredReport> {
  const { location } = report;
  if (location.latitude !== undefined && location.longitude !== undefined) return report;
  const coordinates = await geocodeToronto(location.raw);
  return coordinates ? { ...report, location: { ...location, ...coordinates } } : report;
}

export { extractStreetNames } from "./street-names.ts";
