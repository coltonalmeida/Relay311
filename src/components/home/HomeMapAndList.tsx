"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IncidentRecord } from "@/lib/schemas";
import CityMap from "./CityMap";
import IncidentListPanel from "./IncidentListPanel";

export default function HomeMapAndList({ incidents }: { incidents: IncidentRecord[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const router = useRouter();

  const goToDetail = (id: string) => router.push(`/incidents/${id}`);

  return (
    <div className="flex h-[520px] gap-4">
      <div className="flex-[1.7]">
        <CityMap
          incidents={incidents}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          onSelect={goToDetail}
          openCount={incidents.length}
        />
      </div>
      <div className="flex-1">
        <IncidentListPanel incidents={incidents} hoveredId={hoveredId} onHover={setHoveredId} onSelect={goToDetail} />
      </div>
    </div>
  );
}
