import { readFile } from "node:fs/promises";
import path from "node:path";
import type { StructuredReport } from "./schemas";
import { extractStreetNames, intersectionKeys, normalizeStreetName } from "./street-names.ts";
import { isInToronto, TORONTO_BOUNDS, type Coordinates } from "./toronto-bounds.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Built from the City of Toronto centreline intersection file by `npm run intersections:update`.
const INTERSECTIONS_FILE = path.join(process.cwd(), "data", "toronto-intersections.json");
const MAX_STREETS_PAIRED = 4;

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

// Finds where two of the named streets meet, trying the first two first and then the other pairs.
export function lookupIntersection(streets: string[], index: IntersectionIndex): Coordinates | null {
  const names = [...new Set(streets.slice(0, MAX_STREETS_PAIRED).map(normalizeStreetName))].filter(Boolean);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const key of intersectionKeys(names[i], names[j])) {
        const point = index[key];
        if (point) return toTorontoCoordinates(point[0], point[1]);
      }
    }
  }
  return null;
}

async function searchNominatim(query: string): Promise<Coordinates | null> {
  const { west, south, east, north } = TORONTO_BOUNDS;
  const params = new URLSearchParams({
    q: `${query}, Toronto, Ontario`,
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
// ("Yonge Street near Eglinton Avenue") from the city's intersection file, everything else via Nominatim.
// Never throws: a failed lookup just leaves the incident unplotted.
export async function geocodeToronto(raw: string): Promise<Coordinates | null> {
  const query = raw.trim();
  if (!query) return null;

  const streets = extractStreetNames(query);
  if (streets.length >= 2) {
    const intersection = lookupIntersection(streets, await loadIntersectionIndex());
    if (intersection) return intersection;
  }
  return searchNominatim(query);
}

export async function withCoordinates(report: StructuredReport): Promise<StructuredReport> {
  const { location } = report;
  if (location.latitude !== undefined && location.longitude !== undefined) return report;
  const coordinates = await geocodeToronto(location.raw);
  return coordinates ? { ...report, location: { ...location, ...coordinates } } : report;
}
