import { mergeDuplicateIncidents } from "@/lib/db/incidents";
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
    const result = await mergeDuplicateIncidents(parsed.data);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return Response.json({ error: message }, { status: message === "Incident not found" ? 404 : 500 });
  }
}
