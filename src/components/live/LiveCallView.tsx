"use client";

import { useEffect, useRef, useState } from "react";
import TranscriptLine from "@/components/transcript/TranscriptLine";
import { PRIORITY_TOKENS } from "@/lib/design-tokens";
import type { LiveCallState } from "@/lib/live-call-state";
import { groupTranscriptTurns } from "@/lib/transcript-messages";
import Waveform from "./Waveform";

function formatElapsed(startedAt: string, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function LiveCallView() {
  const [call, setCall] = useState<LiveCallState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const latestMessage = call?.messages.at(-1);
  const transcriptRevision = latestMessage
    ? `${call?.callId}:${call?.messages.length}:${latestMessage.role}:${latestMessage.text}`
    : "";
  const transcriptTurns = groupTranscriptTurns(call?.messages ?? []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/live-call", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { call: LiveCallState | null };
        setCall(data.call);
      } catch {
        // transient network error while polling; keep the last known state
      }
    }

    void poll();
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function endCall() {
    if (!call || ending) return;
    setEnding(true);
    setEndError(null);
    try {
      const response = await fetch("/api/live-call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callId: call.callId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to end the call.");
      setCall(null);
    } catch (error) {
      setEndError(error instanceof Error ? error.message : "Unable to end the call.");
    } finally {
      setEnding(false);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const transcriptPanel = transcriptScrollRef.current;
    if (!transcriptPanel || !transcriptRevision) return;
    transcriptPanel.scrollTo({ top: transcriptPanel.scrollHeight, behavior: "smooth" });
  }, [transcriptRevision]);

  if (!call) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-8 py-7">
        <div className="max-w-md rounded-2xl bg-paper p-8 text-center card-shadow">
          <p className="text-sm font-semibold text-ink">Waiting for an incoming call…</p>
          <p className="mt-2 text-sm text-muted">
            Call +1 (716) 229-8011 — this screen updates automatically once Relay311 picks up.
          </p>
        </div>
      </div>
    );
  }

  const fields = [
    call.liveFields.category ? { label: "Category", value: call.liveFields.category } : null,
    call.liveFields.location ? { label: "Location", value: call.liveFields.location } : null,
    call.liveFields.hazard ? { label: "Hazard", value: call.liveFields.hazard } : null,
  ].filter((field): field is { label: string; value: string } => field !== null);

  return (
    <div className="flex justify-center px-8 py-7">
      <div className="w-full max-w-[680px] rounded-[20px] bg-paper p-6 hero-shadow">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full bg-signal shadow-[0_0_0_6px_rgba(255,92,53,0.14)] ${
              call.status !== "ended" ? "animate-[r311-pulse_1.4s_infinite]" : ""
            }`}
          />
          <span className="text-sm font-semibold text-ink">
            {call.status === "ended" ? "Call ended" : "Live call"} · {formatElapsed(call.startedAt, now)}
          </span>
          {call.callerPhoneMasked && (
            <span className="ml-auto font-mono text-xs text-muted">{call.callerPhoneMasked}</span>
          )}
        </div>

        <div className="mt-4">
          <Waveform active={call.status !== "ended"} />
        </div>

        <div
          ref={transcriptScrollRef}
          className="mt-4 max-h-[280px] overflow-y-auto border-y border-hairline"
        >
          {transcriptTurns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Listening for the caller…</p>
          ) : (
            transcriptTurns.map((message, index) => (
              <TranscriptLine
                key={index}
                role={message.role}
                text={message.text}
                partial={index === transcriptTurns.length - 1 && call.transcribing}
              />
            ))
          )}
        </div>

        {fields.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {fields.map((field) => (
              <span
                key={field.label}
                className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium text-ink"
              >
                <span className="text-muted">{field.label}:</span> {field.value}
              </span>
            ))}
            {call.priority && (
              <span
                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: PRIORITY_TOKENS[call.priority].bg, color: PRIORITY_TOKENS[call.priority].fg }}
              >
                Priority: {PRIORITY_TOKENS[call.priority].label}
              </span>
            )}
          </div>
        )}

        {call.duplicateCandidate && (
          <div className="mt-4 rounded-xl border border-[#f5b942]/40 bg-[#fff6de] px-4 py-3 text-sm text-[#67571c]">
            ⚠ Possible duplicate of {call.duplicateCandidate.displayId} — will auto-link on call end.
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={endCall}
            disabled={ending}
            className="flex-1 rounded-lg bg-signal py-3 text-sm font-bold text-paper disabled:cursor-wait disabled:opacity-60"
          >
            {ending ? "Ending callâ€¦" : "End Call"}
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg border border-ink py-3 text-sm font-bold text-ink"
          >
            Escalate to 911 line
          </button>
        </div>
        {endError && <p className="mt-3 text-sm font-medium text-signal">{endError}</p>}
      </div>
    </div>
  );
}
