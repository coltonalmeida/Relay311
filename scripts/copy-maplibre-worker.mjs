import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

// MapLibre v6 resolves its web worker relative to its own module URL, which breaks once bundled.
// Serve the worker (and the shared chunk it imports) from /maplibre so CityMap can point setWorkerUrl at it.
const source = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist");
const target = path.join(process.cwd(), "public", "maplibre");

await mkdir(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(path.join(source, file), path.join(target, file));
}
