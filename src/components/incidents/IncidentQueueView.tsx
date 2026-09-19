"use client";

import { useMemo, useState } from "react";
import type { IncidentRecord } from "@/lib/schemas";
import IncidentQueueCard from "./IncidentQueueCard";
import StatusFilterTabs, { type QueueFilter } from "./StatusFilterTabs";

const OPEN = new Set(["new", "in_review", "assigned"]);
const RESOLVED = new Set(["resolved", "dismissed"]);

export default function IncidentQueueView({
  incidents,
  linkedCallCounts,
}: {
  incidents: IncidentRecord[];
  linkedCallCounts: Record<string, number>;
}) {
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return incidents.filter((incident) => {
      if (filter === "open" && !OPEN.has(incident.status)) return false;
      if (filter === "resolved" && !RESOLVED.has(incident.status)) return false;
      if (!query) return true;
      return (
        incident.title.toLowerCase().includes(query) ||
        incident.location.raw.toLowerCase().includes(query) ||
        incident.id.toLowerCase().includes(query)
      );
    });
  }, [incidents, filter, search]);

  return (
    <div className="px-8 py-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <StatusFilterTabs value={filter} onChange={setFilter} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search incidents…"
          className="h-[34px] w-60 rounded-lg border border-hairline bg-paper px-3 text-sm text-ink outline-none focus:border-signal"
        />
      </div>
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No incidents match this filter.</p>
        ) : (
          filtered.map((incident) => (
            <IncidentQueueCard
              key={incident.id}
              incident={incident}
              linkedCallCount={linkedCallCounts[incident.id] ?? 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
