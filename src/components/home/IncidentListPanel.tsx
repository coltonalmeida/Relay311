"use client";

import PriorityPill from "@/components/badges/PriorityPill";
import StatusPill from "@/components/badges/StatusPill";
import { displayId } from "@/lib/incident-heuristics";
import type { IncidentRecord } from "@/lib/schemas";

export default function IncidentListPanel({
  incidents,
  hoveredId,
  onHover,
  onSelect,
}: {
  incidents: IncidentRecord[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-1 flex-col rounded-2xl bg-paper p-5 card-shadow">
      <h2 className="mb-3 text-sm font-semibold text-ink">Incident list</h2>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {incidents.length === 0 ? (
          <p className="text-sm text-muted">No open incidents right now.</p>
        ) : (
          incidents.map((incident) => (
            <button
              key={incident.id}
              type="button"
              onMouseEnter={() => onHover(incident.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(incident.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                hoveredId === incident.id ? "border-signal/40 bg-cream" : "border-transparent hover:bg-cream"
              }`}
            >
              <div className="flex items-center gap-2">
                <PriorityPill priority={incident.priority} />
                <span className="truncate text-sm font-semibold text-ink">{incident.title}</span>
              </div>
              <p className="mt-1 truncate text-xs text-muted">{incident.location.raw || "Location unconfirmed"}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold text-muted">{displayId(incident.id, "INC")}</span>
                <StatusPill status={incident.status} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
