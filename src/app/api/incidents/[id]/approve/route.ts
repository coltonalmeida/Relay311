import { approveIncident } from "@/lib/db/incidents";
import { z } from "zod";

export const runtime = "nodejs";

const IdSchema = z.string().uuid();

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = IdSchema.safeParse(id);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed", details: { id: ["Expected a UUID"] } }, { status: 400 });
  }

  try {
    const incident = await approveIncident(parsed.data);
    return incident ? Response.json({ incident }) : Response.json({ error: "Incident not found" }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database error" }, { status: 500 });
  }
}
