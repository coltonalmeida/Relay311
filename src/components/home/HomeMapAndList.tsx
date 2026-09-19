"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OPEN_INCIDENT_STATUSES, type IncidentRecord } from "@/lib/schemas";
import CityMap from "./CityMap";
import IncidentListPanel from "./IncidentListPanel";

const REFRESH_INTERVAL_MS = 5_000;

function sameSnapshot(current: IncidentRecord[], incoming: IncidentRecord[]): boolean {
  return (
    current.length === incoming.length &&
    current.every((incident, index) => {
      const next = incoming[index];
      return (
        incident.id === next?.id &&
        incident.updatedAt === next.updatedAt &&
        incident.location.latitude === next.location.latitude &&
        incident.location.longitude === next.location.longitude
      );
    })
  );
}

export default function HomeMapAndList({ incidents: initialIncidents }: { incidents: IncidentRecord[] }) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let controller: AbortController | null = null;

    async function refreshIncidents() {
      if (stopped || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      controller = new AbortController();
      try {
        const response = await fetch("/api/incidents?status=open", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { incidents?: IncidentRecord[] };
        if (!Array.isArray(body.incidents) || stopped) return;
        const open = body.incidents.filter((incident) => OPEN_INCIDENT_STATUSES.includes(incident.status));
        setIncidents((current) => (sameSnapshot(current, open) ? current : open));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to refresh map incidents", error);
        }
      } finally {
        inFlight = false;
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshIncidents();
    }

    void refreshIncidents();
    const interval = window.setInterval(() => void refreshIncidents(), REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const goToDetail = (id: string) => router.push(`/incidents/${id}`);
  const activeHoveredId = hoveredId && incidents.some((incident) => incident.id === hoveredId) ? hoveredId : null;

  return (
    <div className="flex h-[520px] gap-4">
      <div className="flex-[1.7]">
        <CityMap
          incidents={incidents}
          hoveredId={activeHoveredId}
          onHover={setHoveredId}
          onSelect={goToDetail}
          openCount={incidents.length}
        />
      </div>
      <div className="flex-1">
        <IncidentListPanel
          incidents={incidents}
          hoveredId={activeHoveredId}
          onHover={setHoveredId}
          onSelect={goToDetail}
        />
      </div>
    </div>
  );
}
