"use client";

import { useRouter } from "next/navigation";
import CategoryChip from "@/components/badges/CategoryChip";
import PriorityPill from "@/components/badges/PriorityPill";
import StatusPill from "@/components/badges/StatusPill";
import { categoryTokens } from "@/lib/design-tokens";
import { displayId } from "@/lib/incident-heuristics";
import type { IncidentRecord } from "@/lib/schemas";

export default function IncidentQueueCard({
  incident,
  linkedCallCount,
}: {
  incident: IncidentRecord;
  linkedCallCount: number;
}) {
  const router = useRouter();
  const tokens = categoryTokens(incident.category);

  return (
    <button
      type="button"
      onClick={() => router.push(`/incidents/${incident.id}`)}
      className="flex w-full items-center gap-3 rounded-2xl bg-paper px-4 py-3.5 text-left card-shadow transition-transform hover:-translate-y-px"
    >
      <span
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] text-[11px] font-bold"
        style={{ background: tokens.bg, color: tokens.fg }}
      >
        {incident.category.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{incident.title}</p>
        <p className="truncate text-xs text-muted">
          {incident.location.raw || "Location unconfirmed"} · {displayId(incident.id, "INC")}
        </p>
      </div>
      <div className="hidden md:block">
        <CategoryChip category={incident.category} />
      </div>
      <PriorityPill priority={incident.priority} />
      <StatusPill status={incident.status} />
      {linkedCallCount > 1 && (
        <span className="rounded-full bg-[#e7ede9] px-2.5 py-1 text-[11px] font-semibold text-muted">
          {linkedCallCount} linked
        </span>
      )}
      <span aria-hidden className="text-muted">
        ›
      </span>
    </button>
  );
}
