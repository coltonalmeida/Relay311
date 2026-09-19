import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { intersectionKeys, normalizeStreetName } from "../src/lib/street-names.ts";

// City of Toronto Open Data: "Intersection File - City of Toronto", WGS84 (EPSG:4326) CSV, refreshed daily.
const SOURCE_URL =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/dataset/2c83f641-7808-49ba-b80f-7011851d4e27/resource/eb42b978-02ad-4528-a033-8bebb9360c57/download/centreline-intersection-4326.csv";
const OUTPUT = path.join(process.cwd(), "data", "toronto-intersections.json");

// Lower rank wins when several intersections share a pair of street names.
function classificationRank(description) {
  if (description.startsWith("Major")) return 0;
  if (description.startsWith("Minor")) return 1;
  if (description.startsWith("Lesser")) return 2;
  return 3;
}

// Minimal RFC 4180 line parser; the file has no embedded newlines, only quoted geometry fields.
function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(180_000) });
if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
const [header, ...lines] = (await response.text()).split(/\r?\n/).filter(Boolean);

const columns = parseCsvLine(header);
const column = (name) => {
  const index = columns.indexOf(name);
  if (index === -1) throw new Error(`Column ${name} missing from intersection file`);
  return index;
};
const DESC = column("INTERSECTION_DESC");
const CLASS = column("CLASSIFICATION_DESC");
const EXPIRY = column("DATE_EXPIRY");
const GEOMETRY = column("geometry");

const now = Date.now();
const best = new Map();
let skipped = 0;

for (const line of lines) {
  const fields = parseCsvLine(line);
  const expiry = Date.parse(fields[EXPIRY]);
  if (Number.isFinite(expiry) && expiry < now) {
    skipped += 1;
    continue;
  }

  let point;
  try {
    // A GeoJSON Point or single-point MultiPoint in [lng, lat] order.
    const { type, coordinates } = JSON.parse(fields[GEOMETRY]);
    const [lng, lat] = type === "MultiPoint" ? coordinates[0] : coordinates;
    point = [Math.round(lat * 1e5) / 1e5, Math.round(lng * 1e5) / 1e5];
  } catch {
    skipped += 1;
    continue;
  }

  // Public laneways ("Ln S Dundas E Bathurst") are never how callers describe a location.
  const names = [
    ...new Set(
      fields[DESC].split(" / ")
        .map(normalizeStreetName)
        .filter((name) => name && name !== "none" && !name.startsWith("ln ")),
    ),
  ];
  const rank = classificationRank(fields[CLASS]);

  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const key of intersectionKeys(names[i], names[j])) {
        const current = best.get(key);
        if (!current || rank < current.rank) best.set(key, { rank, point });
      }
    }
  }
}

const entries = Object.fromEntries([...best].sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, { point }]) => [key, point]));
const output = JSON.stringify({ source: SOURCE_URL, generatedAt: new Date().toISOString(), entries });
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${output}\n`, "utf8");

console.log(
  `Wrote ${best.size} intersection keys from ${lines.length} records (${skipped} skipped) ` +
    `to ${path.relative(process.cwd(), OUTPUT)} (${(Buffer.byteLength(output) / 1024 / 1024).toFixed(1)} MB).`,
);
