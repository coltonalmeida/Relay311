import { getLiveCall } from "@/lib/live-call-state";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ call: getLiveCall() });
}
