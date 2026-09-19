import { getIncidents, getOpenIncidents } from "@/lib/db/incidents";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get("status");
    const incidents = status === "open" ? await getOpenIncidents() : await getIncidents();
    return Response.json({ incidents });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}
