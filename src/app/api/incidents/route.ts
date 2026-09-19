import { getIncidents } from "@/lib/db/incidents";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ incidents: await getIncidents() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}
