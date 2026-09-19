"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CategoryChip from "@/components/badges/CategoryChip";
import PriorityPill from "@/components/badges/PriorityPill";
import StatusPill from "@/components/badges/StatusPill";
import TranscriptLine from "@/components/transcript/TranscriptLine";
import type { ActivityEntry } from "@/lib/incident-heuristics";
import { displayId, formatDuration, humanizeCategory } from "@/lib/incident-heuristics";
import type { CallRecord, IncidentRecord } from "@/lib/schemas";

type Tab = "summary" | "details" | "transcript" | "activity";
const TABS: { value: Tab; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "details", label: "Details" },
  { value: "transcript", label: "Transcript & duplicates" },
  { value: "activity", label: "Activity" },
];

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DetailView({
  incident,
  primaryCall,
  linkedCalls,
  activity,
}: {
  incident: IncidentRecord;
  primaryCall: CallRecord | null;
  linkedCalls: CallRecord[];
  activity: ActivityEntry[];
}) {
  const [tab, setTab] = useState<Tab>("summary");
  const [pending, setPending] = useState<"approve" | "dismiss" | "merge" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function runAction(action: "approve" | "dismiss" | "merge") {
    setPending(action);
    setError(null);
    try {
      const response = await fetch(`/api/incidents/${incident.id}/${action}`, { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-[860px] px-8 py-7">
      <Link href="/incidents" className="text-[11.5px] font-semibold text-signal no-underline">
        ← Back to incidents
      </Link>

      <p className="mt-4 font-mono text-xs text-muted">{displayId(incident.id, "INC")}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{incident.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityPill priority={incident.priority} />
        <StatusPill status={incident.status} />
        <CategoryChip category={incident.category} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          disabled={pending !== null || incident.status === "assigned"}
          onClick={() => void runAction("approve")}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {pending === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void runAction("merge")}
          className="rounded-lg border border-hairline bg-paper px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {pending === "merge" ? "Merging…" : "Merge duplicates"}
        </button>
        <button
          type="button"
          disabled={pending !== null || incident.status === "dismissed"}
          onClick={() => void runAction("dismiss")}
          className="ml-auto text-sm font-semibold text-red-destructive disabled:opacity-50"
        >
          {pending === "dismiss" ? "Dismissing…" : "Dismiss"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-destructive">{error}</p>}

      <div className="mt-6 flex gap-5 border-b border-hairline">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === option.value ? "border-signal text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "summary" && (
          <div className="rounded-2xl bg-paper p-5 card-shadow">
            <p className="mb-2 font-mono text-[10px] font-bold tracking-[0.08em] text-green-text">
              AI-GENERATED SUMMARY
            </p>
            <p className="text-[15px] leading-relaxed text-ink">{incident.summary}</p>
          </div>
        )}

        {tab === "details" && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-2xl bg-paper p-5 card-shadow sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Category</p>
              <p className="mt-1 text-sm font-medium text-ink">{humanizeCategory(incident.category)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Location</p>
              <p className="mt-1 text-sm font-medium text-ink">{incident.location.raw || "Not provided"}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Reported hazard</p>
              <p className="mt-1 text-sm font-medium text-ink">{incident.subtype.replace(/-/g, " ")}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">First reported</p>
              <p className="mt-1 text-sm font-medium text-ink">
                {primaryCall ? formatTimestamp(primaryCall.createdAt) : formatTimestamp(incident.createdAt)}
              </p>
            </div>
          </div>
        )}

        {tab === "transcript" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-paper p-5 card-shadow">
              {primaryCall && primaryCall.messages.length > 0 ? (
                primaryCall.messages.map((message, index) => (
                  <TranscriptLine key={index} role={message.role} text={message.text} />
                ))
              ) : (
                <p className="text-sm text-muted">No transcript available for this call.</p>
              )}
            </div>
            <div className="rounded-2xl bg-paper p-5 card-shadow">
              <p className="mb-3 text-sm font-semibold text-ink">Linked calls (auto-grouped duplicates)</p>
              {linkedCalls.length === 0 ? (
                <p className="text-sm text-muted">No duplicate calls have been linked to this incident.</p>
              ) : (
                <ul className="space-y-2">
                  {linkedCalls.map((call) => (
                    <li key={call.id} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted">{displayId(call.id, "CALL")}</span>
                      <span className="text-ink">{formatTimestamp(call.createdAt)}</span>
                      <span className="text-muted">
                        {call.durationSeconds ? formatDuration(call.durationSeconds * 1000) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="rounded-2xl bg-paper p-5 card-shadow">
            <ul className="space-y-3.5">
              {activity.map((entry, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-text" />
                  <span className="flex-1 text-ink">{entry.label}</span>
                  <span className="shrink-0 text-xs text-muted">{formatTimestamp(entry.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
