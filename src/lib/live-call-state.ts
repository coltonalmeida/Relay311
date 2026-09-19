import type { Priority, TranscriptMessage } from "./schemas";

export type LiveCallStatus = "ringing" | "in-progress" | "ended";

export type LiveCallFields = {
  category?: string;
  location?: string;
  hazard?: string;
};

export type LiveDuplicateCandidate = {
  incidentId: string;
  displayId: string;
  title: string;
};

export type LiveCallState = {
  callId: string;
  displayId: string;
  status: LiveCallStatus;
  startedAt: string;
  callerPhoneMasked: string | null;
  messages: TranscriptMessage[];
  liveFields: LiveCallFields;
  priority: Priority | null;
  duplicateCandidate: LiveDuplicateCandidate | null;
  transcribing: boolean;
};

// A single in-memory slot for "the" call currently in progress. This app runs as one
// long-lived Node process (see the existing file-based transcript watcher/storage in
// src/lib/transcripts.ts, which makes the same assumption) — it would need a shared
// store (e.g. Supabase) instead if ever deployed as multiple serverless instances.
let current: LiveCallState | null = null;

export function getLiveCall(): LiveCallState | null {
  return current;
}

export function startLiveCall(state: LiveCallState): void {
  current = state;
}

export function updateLiveCall(callId: string, patch: Partial<LiveCallState>): void {
  if (!current || current.callId !== callId) return;
  current = { ...current, ...patch };
}

export function appendLiveMessage(callId: string, message: TranscriptMessage): void {
  if (!current || current.callId !== callId) return;
  const messages = [...current.messages];
  const last = messages[messages.length - 1];
  if (last?.partial && last.role === message.role) {
    messages[messages.length - 1] = message;
  } else {
    messages.push(message);
  }
  current = { ...current, messages, transcribing: Boolean(message.partial) };
}

export function clearLiveCall(callId?: string): void {
  if (callId && current?.callId !== callId) return;
  current = null;
}
