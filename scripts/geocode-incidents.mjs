import { createClient } from "@supabase/supabase-js";
import { geocodeToronto } from "../src/lib/geocode.ts";

// Nominatim's usage policy allows at most 1 request per second.
const REQUEST_INTERVAL_MS = 1100;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const contact = process.env.GEOCODER_CONTACT_EMAIL;
if (!contact) console.warn("GEOCODER_CONTACT_EMAIL is not set; Nominatim may throttle anonymous requests.");

const { data, error } = await supabase.from("incidents").select("id, location");
if (error) throw new Error(error.message);

const pending = data.filter(
  (row) => row.location?.raw?.trim() && (row.location.latitude === undefined || row.location.longitude === undefined),
);
console.log(`${pending.length} incident(s) need coordinates.`);

let located = 0;
for (const [index, row] of pending.entries()) {
  if (index > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
  const raw = row.location.raw.trim();
  try {
    const coordinates = await geocodeToronto(raw);
    if (!coordinates) {
      console.log(`  miss  ${row.id}  "${raw}"`);
      continue;
    }
    const updated = await supabase
      .from("incidents")
      .update({ location: { ...row.location, ...coordinates } })
      .eq("id", row.id);
    if (updated.error) throw new Error(updated.error.message);
    located += 1;
    console.log(`  hit   ${row.id}  "${raw}" -> ${coordinates.latitude}, ${coordinates.longitude}`);
  } catch (err) {
    console.log(`  error ${row.id}  "${raw}": ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`Geocoded ${located} of ${pending.length} incident(s).`);
