// Street-name parsing shared by the geocoder and scripts/update-toronto-intersections.mjs.
// Must stay dependency-free so Node can load it directly from the script.

// Spoken or written suffix -> the abbreviation used by the City of Toronto centreline data.
const SUFFIXES: Record<string, string> = {
  street: "st", st: "st", avenue: "ave", ave: "ave", av: "ave", road: "rd", rd: "rd",
  boulevard: "blvd", blvd: "blvd", drive: "dr", dr: "dr", crescent: "cres", cres: "cres",
  court: "crt", crt: "crt", ct: "crt", place: "pl", pl: "pl", trail: "trl", trl: "trl",
  terrace: "ter", ter: "ter", gardens: "gdns", gdns: "gdns", circle: "crcl", crcl: "crcl",
  grove: "grv", grv: "grv", heights: "hts", hts: "hts", gate: "gt", gt: "gt", square: "sq", sq: "sq",
  parkway: "pkwy", pkwy: "pkwy", lane: "ln", ln: "ln", highway: "hwy", hwy: "hwy",
  way: "way", line: "line", quay: "quay", mews: "mews", walk: "walk", path: "path",
};
const DIRECTIONS: Record<string, string> = {
  east: "e", e: "e", west: "w", w: "w", north: "n", n: "n", south: "s", s: "s",
};
const DISPLAY_SUFFIXES: Record<string, string> = {
  st: "Street", ave: "Avenue", rd: "Road", blvd: "Boulevard", dr: "Drive", cres: "Crescent",
  crt: "Court", pl: "Place", trl: "Trail", ter: "Terrace", gdns: "Gardens", crcl: "Circle",
  grv: "Grove", hts: "Heights", gt: "Gate", sq: "Square", pkwy: "Parkway", ln: "Lane",
  hwy: "Highway", way: "Way", line: "Line", quay: "Quay", mews: "Mews", walk: "Walk", path: "Path",
};
const DISPLAY_DIRECTIONS: Record<string, string> = { e: "East", w: "West", n: "North", s: "South" };

// Words ending in a street suffix, optionally followed by a direction.
const STREET_PATTERN = new RegExp(
  `\\b((?:[A-Z][\\w'.-]*\\s)+?)(${Object.keys(SUFFIXES).join("|")})\\b\\.?(?:\\s(${Object.keys(DIRECTIONS).join("|")})\\b\\.?)?`,
  "gi",
);

// Street names mentioned in a caller's description, as written,
// e.g. "laneway off Queen St E near Logan Avenue" -> ["Queen St E", "Logan Avenue"].
export function extractStreetNames(raw: string): string[] {
  return [...raw.matchAll(STREET_PATTERN)].flatMap(([, name, suffix, direction]) => {
    // The pattern is case-insensitive so it can catch "street"/"St", which lets the prefix swallow filler
    // words ("laneway off Queen"). Keep only the trailing run of capitalised words as the name.
    const words = name.trim().split(/\s+/);
    const base = words.slice(words.findLastIndex((word) => !/^[A-Z]/.test(word)) + 1);
    if (base.length === 0) return [];
    const canonicalSuffix = SUFFIXES[suffix.toLowerCase()];
    const canonicalDirection = direction ? DIRECTIONS[direction.toLowerCase()] : undefined;
    return [
      [...base, DISPLAY_SUFFIXES[canonicalSuffix], canonicalDirection && DISPLAY_DIRECTIONS[canonicalDirection]]
        .filter(Boolean)
        .join(" "),
    ];
  });
}

// Capitalised phrases that are not suffixed streets, e.g. "Queens Park on Wellesley Street West" -> ["Queens Park"].
// Some Toronto streets have no standard suffix (Queens Park, The Esplanade), so these are also tried as streets.
export function extractPlaceNames(raw: string): string[] {
  return [...raw.matchAll(/\b[A-Z][\w'’.-]*(?:\s+[A-Z][\w'’.-]*)*/g)]
    .map(([phrase]) => phrase)
    .filter((phrase) => phrase.toLowerCase() !== "toronto" && extractStreetNames(phrase).length === 0);
}

// Canonical lowercase form shared by caller phrasing and city data:
// "Eglinton Avenue East" and "Eglinton Ave E" both become "eglinton ave e"; "Saint Clair" becomes "st clair".
export function normalizeStreetName(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return "";
  if (tokens[0] === "saint") tokens[0] = "st";

  let suffixIndex = tokens.length - 1;
  if (tokens.length >= 2 && DIRECTIONS[tokens[suffixIndex]]) {
    tokens[suffixIndex] = DIRECTIONS[tokens[suffixIndex]];
    suffixIndex -= 1;
  }
  if (suffixIndex >= 1 && SUFFIXES[tokens[suffixIndex]]) tokens[suffixIndex] = SUFFIXES[tokens[suffixIndex]];
  return tokens.join(" ");
}

function withoutDirection(normalized: string): string {
  const tokens = normalized.split(" ");
  return tokens.length >= 2 && DISPLAY_DIRECTIONS[tokens[tokens.length - 1]]
    ? tokens.slice(0, -1).join(" ")
    : normalized;
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}&${b}` : `${b}&${a}`;
}

// Index keys for two normalized street names, most specific first: exact names, then with directions dropped,
// so "Yonge Street near Eglinton Avenue" meets the city's "Yonge St / Eglinton Ave E".
export function intersectionKeys(a: string, b: string): string[] {
  const bareA = withoutDirection(a);
  const bareB = withoutDirection(b);
  if (bareA === bareB) return [];
  return [...new Set([pairKey(a, b), pairKey(bareA, b), pairKey(a, bareB), pairKey(bareA, bareB)])];
}
