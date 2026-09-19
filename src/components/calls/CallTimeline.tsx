import Link from "next/link";
import CallOutcomePill from "@/components/calls/CallOutcomePill";
import { CALL_OUTCOME_COLORS, type CallOutcome } from "@/lib/design-tokens";
import { displayId, formatDuration, isEscalatedCall } from "@/lib/incident-heuristics";
import type { CallRecord } from "@/lib/schemas";

function outcomeFor(call: CallRecord): { outcome: CallOutcome; label: string } {
  if (call.incidentId) {
    return { outcome: "linked", label: `Linked to incident ${displayId(call.incidentId, "INC")}` };
  }
  if (isEscalatedCall(call.messages)) {
    return { outcome: "escalated", label: "Escalated to 911" };
  }
  return { outcome: "none", label: "No action needed" };
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CallTimeline({ calls }: { calls: CallRecord[] }) {
  return (
    <div className="mx-auto max-w-[920px] px-8 py-7">
      <h1 className="mb-5 text-xl font-bold tracking-tight text-ink">Calls & history</h1>
      <div className="relative space-y-4 pl-6">
        <div className="absolute top-1 bottom-1 left-[7px] w-0.5 bg-hairline" />
        {calls.length === 0 ? (
          <p className="text-sm text-muted">No calls have come in yet.</p>
        ) : (
          calls.map((call) => {
            const { outcome, label } = outcomeFor(call);
            const dotColor = CALL_OUTCOME_COLORS[outcome].fg;
            const content = (
              <div className="rounded-2xl bg-paper p-4 card-shadow">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted">{displayId(call.id, "CALL")}</span>
                  <span className="text-xs text-muted">
                    {formatTimestamp(call.createdAt)}
                    {call.durationSeconds ? ` · ${formatDuration(call.durationSeconds * 1000)}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink">
                  {call.report?.summary ?? (call.processingStatus === "processing" ? "Processing…" : "No summary available.")}
                </p>
                <div className="mt-2">
                  <CallOutcomePill outcome={outcome} label={label} />
                </div>
              </div>
            );
            return (
              <div key={call.id} className="relative">
                <span
                  className="absolute -left-6 top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-cream"
                  style={{ background: dotColor }}
                />
                {call.incidentId ? <Link href={`/incidents/${call.incidentId}`}>{content}</Link> : content}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
