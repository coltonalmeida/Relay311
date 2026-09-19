"use client";

import { PRIORITY_TOKENS } from "@/lib/design-tokens";
import { pseudoGeocode } from "@/lib/incident-heuristics";
import type { IncidentRecord, Priority } from "@/lib/schemas";

const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"];

export default function CityMap({
  incidents,
  hoveredId,
  onHover,
  onSelect,
  openCount,
}: {
  incidents: IncidentRecord[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  openCount: number;
}) {
  return (
    <div className="flex h-full flex-1 flex-col rounded-2xl bg-paper p-5 card-shadow">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">City map — click a hotspot for details</h2>
        <span className="font-mono text-[11px] font-semibold text-muted">{openCount} open</span>
      </div>
      <div
        className="relative flex-1 overflow-hidden rounded-xl"
        style={{
          backgroundColor: "#eef0e6",
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(20,35,31,0.05) 0, rgba(20,35,31,0.05) 1px, transparent 1px, transparent 12px)",
        }}
      >
        {incidents.map((incident) => {
          const { xPct, yPct } =
            incident.location.latitude !== undefined && incident.location.longitude !== undefined
              ? pseudoGeocode(`${incident.location.latitude},${incident.location.longitude}`)
              : pseudoGeocode(incident.id);
          const tokens = PRIORITY_TOKENS[incident.priority];
          const active = hoveredId === incident.id;
          return (
            <button
              key={incident.id}
              type="button"
              aria-label={incident.title}
              onMouseEnter={() => onHover(incident.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(incident.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(incident.id)}
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper transition-transform"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                background: tokens.dot,
                transform: active ? "translate(-50%, -50%) scale(1.4)" : "translate(-50%, -50%)",
                boxShadow: active ? `0 0 0 5px ${tokens.bg}` : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4">
        {PRIORITY_ORDER.map((priority) => (
          <span key={priority} className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_TOKENS[priority].dot }} />
            {PRIORITY_TOKENS[priority].label}
          </span>
        ))}
      </div>
    </div>
  );
}
