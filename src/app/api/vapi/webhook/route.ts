import { timingSafeEqual } from "node:crypto";
import { saveTranscriptFile } from "@/lib/transcripts";
import type { TranscriptInput } from "@/lib/transcripts";

export const runtime = "nodejs";

function secretsMatch(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function messagesFromArtifact(artifact: Record<string, unknown> | null): TranscriptInput["messages"] {
  if (!Array.isArray(artifact?.messages)) return [];
  return artifact.messages.flatMap((entry) => {
    const message = asRecord(entry);
    const role = message?.role;
    const text = message?.message ?? message?.content;
    if (
      (role === "assistant" || role === "user" || role === "system" || role === "tool") &&
      typeof text === "string"
    ) {
      return [{ role, text }];
    }
    return [];
  });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.VAPI_WEBHOOK_SECRET;
  if (expectedSecret && !secretsMatch(request.headers.get("x-vapi-secret"), expectedSecret)) {
    return Response.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  let payload: Record<string, unknown> | null;
  try {
    payload = asRecord(await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = asRecord(payload?.message);
  if (!message || typeof message.type !== "string") {
    return Response.json({ error: "Invalid Vapi payload" }, { status: 400 });
  }
  if (message.type !== "end-of-call-report") {
    return Response.json({ received: true, type: message.type });
  }

  const call = asRecord(message.call);
  const artifact = asRecord(message.artifact);
  const callId = typeof call?.id === "string" ? call.id : null;
  const transcript =
    (typeof artifact?.transcript === "string" && artifact.transcript) ||
    (typeof message.transcript === "string" && message.transcript) ||
    "";
  if (!callId || !transcript) {
    return Response.json({ error: "End-of-call report is missing call ID or transcript" }, { status: 422 });
  }

  const customer = asRecord(call?.customer);
  const saved = await saveTranscriptFile({
    callId,
    transcript,
    messages: messagesFromArtifact(artifact),
    callerPhone: typeof customer?.number === "string" ? customer.number : null,
    endedReason: typeof message.endedReason === "string" ? message.endedReason : null,
    createdAt: typeof call?.createdAt === "string" ? call.createdAt : undefined,
  });

  return Response.json({ received: true, transcriptId: saved.id, textFile: saved.textFile });
}
