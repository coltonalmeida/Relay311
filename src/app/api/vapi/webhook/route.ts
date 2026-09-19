import { timingSafeEqual } from "node:crypto";
import { createCallWithClassification } from "@/lib/db/calls";
import { getOpenIncidents } from "@/lib/db/incidents";
import { derivePriority, displayId, findDuplicateCandidate, humanizeCategory, maskPhone } from "@/lib/incident-heuristics";
import {
  appendLiveMessage,
  clearLiveCall,
  getLiveCall,
  startLiveCall,
  updateLiveCall,
} from "@/lib/live-call-state";
import type { TranscriptMessage } from "@/lib/schemas";
import { saveTranscriptFile } from "@/lib/transcripts";
import { processTranscript } from "@/lib/transcript-processor";

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

function messagesFromArtifact(artifact: Record<string, unknown> | null): TranscriptMessage[] {
  if (!Array.isArray(artifact?.messages)) return [];
  return artifact.messages.flatMap((entry) => {
    const message = asRecord(entry);
    const role = message?.role;
    const text = message?.message ?? message?.content;
    if ((role === "assistant" || role === "user") && typeof text === "string") {
      return [{ role, text }];
    }
    return [];
  });
}

// Best-effort live preview of AI-extracted fields while a call is still in progress.
// Only re-classifies every other finalized transcript turn, so this stays cheap and
// never blocks the webhook response — the authoritative classification runs once,
// synchronously, on end-of-call-report.
let finalTranscriptTurnsSinceClassify = 0;

async function refreshLiveExtraction(callId: string) {
  const state = getLiveCall();
  if (!state || state.callId !== callId) return;

  const transcript = state.messages
    .filter((message) => !message.partial)
    .map((message) => `${message.role === "assistant" ? "Relay311" : "Caller"}: ${message.text}`)
    .join("\n");
  if (transcript.trim().length < 40) return;

  try {
    const report = await processTranscript(transcript);
    const openIncidents = await getOpenIncidents();
    const duplicate = report.actionable ? findDuplicateCandidate(report, openIncidents) : null;

    updateLiveCall(callId, {
      liveFields: {
        category: humanizeCategory(report.category),
        location: report.location.raw || undefined,
        hazard: report.actionable ? report.summary.slice(0, 80) : undefined,
      },
      priority: report.actionable ? derivePriority(report) : null,
      duplicateCandidate: duplicate
        ? { incidentId: duplicate.id, displayId: displayId(duplicate.id, "INC"), title: duplicate.title }
        : null,
    });
  } catch (error) {
    console.error("Live transcript preview classification failed (non-fatal)", error);
  }
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

  const call = asRecord(message.call);
  const callId = typeof call?.id === "string" ? call.id : null;

  if (message.type === "status-update") {
    if (callId) {
      const status = typeof message.status === "string" ? message.status : "";
      if (status === "ringing" || status === "in-progress") {
        const existing = getLiveCall();
        if (!existing || existing.callId !== callId) {
          const customer = asRecord(call?.customer);
          startLiveCall({
            callId,
            displayId: displayId(callId, "CALL"),
            status: status === "ringing" ? "ringing" : "in-progress",
            startedAt: new Date().toISOString(),
            callerPhoneMasked: maskPhone(typeof customer?.number === "string" ? customer.number : null),
            messages: [],
            liveFields: {},
            priority: null,
            duplicateCandidate: null,
            transcribing: false,
          });
          finalTranscriptTurnsSinceClassify = 0;
        } else {
          updateLiveCall(callId, { status: "in-progress" });
        }
      } else if (status === "ended") {
        updateLiveCall(callId, { status: "ended", transcribing: false });
      }
    }
    return Response.json({ received: true, type: message.type });
  }

  if (message.type === "transcript") {
    if (callId) {
      const role = message.role === "assistant" || message.role === "user" ? message.role : null;
      const text = typeof message.transcript === "string" ? message.transcript : "";
      const isPartial = message.transcriptType !== "final";
      if (role && text) {
        appendLiveMessage(callId, { role, text, partial: isPartial });
        if (!isPartial) {
          finalTranscriptTurnsSinceClassify += 1;
          if (finalTranscriptTurnsSinceClassify % 2 === 0) {
            await refreshLiveExtraction(callId);
          }
        }
      }
    }
    return Response.json({ received: true, type: message.type });
  }

  if (message.type !== "end-of-call-report") {
    return Response.json({ received: true, type: message.type });
  }

  const artifact = asRecord(message.artifact);
  const transcript =
    (typeof artifact?.transcript === "string" && artifact.transcript) ||
    (typeof message.transcript === "string" && message.transcript) ||
    "";
  if (!callId || !transcript) {
    return Response.json({ error: "End-of-call report is missing call ID or transcript" }, { status: 422 });
  }

  const customer = asRecord(call?.customer);
  const callerPhone = typeof customer?.number === "string" ? customer.number : null;
  const providerMessages = messagesFromArtifact(artifact);
  const endedReason = typeof message.endedReason === "string" ? message.endedReason : null;

  const saved = await saveTranscriptFile({
    callId,
    transcript,
    messages: providerMessages,
    callerPhone,
    endedReason,
    createdAt: typeof call?.createdAt === "string" ? call.createdAt : undefined,
  });

  const startedAt = typeof call?.startedAt === "string" ? call.startedAt : undefined;
  const endedAt = typeof call?.endedAt === "string" ? call.endedAt : undefined;
  const durationSeconds =
    startedAt && endedAt
      ? Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
      : undefined;

  try {
    await createCallWithClassification({
      externalCallId: callId,
      transcript,
      messages: saved.messages.filter(
        (entry): entry is TranscriptMessage => entry.role === "assistant" || entry.role === "user",
      ),
      callerPhone,
      startedAt,
      endedAt,
      durationSeconds,
      provider: "vapi",
      phoneNumberId: typeof call?.phoneNumberId === "string" ? call.phoneNumberId : undefined,
      assistantId: typeof call?.assistantId === "string" ? call.assistantId : undefined,
      providerStatus: typeof call?.status === "string" ? call.status : undefined,
      endedReason: endedReason ?? undefined,
      textFile: saved.textFile,
    });
  } catch (error) {
    console.error("Unable to persist Vapi call to Supabase", error);
  } finally {
    clearLiveCall(callId);
  }

  return Response.json({ received: true, transcriptId: saved.id, textFile: saved.textFile });
}
