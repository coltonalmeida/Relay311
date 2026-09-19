import { getCalls } from "@/lib/db/calls";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ calls: await getCalls() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}
