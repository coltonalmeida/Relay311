"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { PRIORITY_TOKENS } from "@/lib/design-tokens";
import { displayId } from "@/lib/incident-heuristics";
import { TORONTO_BOUNDS } from "@/lib/toronto-bounds";
import type { IncidentRecord, Priority } from "@/lib/schemas";

const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"];
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

type MapLibreModule = typeof import("maplibre-gl");
type LocatedIncident = IncidentRecord & { location: { latitude: number; longitude: number } };

function isLocated(incident: IncidentRecord): incident is LocatedIncident {
  return incident.location.latitude !== undefined && incident.location.longitude !== undefined;
}

const { west, south, east, north } = TORONTO_BOUNDS;
const TORONTO_LNGLAT_BOUNDS: [[number, number], [number, number]] = [
  [west, south],
  [east, north],
];
// Loose enough that the whole city fits at any card size, tight enough to keep the view on Toronto.
const PANNING_BOUNDS: [[number, number], [number, number]] = [
  [west - 0.25, south - 0.12],
  [east + 0.25, north + 0.12],
];

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
  const containerRef = useRef<HTMLDivElement>(null);
  const pinsRef = useRef(new Map<string, (active: boolean) => void>());
  const handlersRef = useRef({ onHover, onSelect });
  const [loaded, setLoaded] = useState<{ map: MapLibreMap; maplibre: MapLibreModule } | null>(null);

  useEffect(() => {
    handlersRef.current = { onHover, onSelect };
  }, [onHover, onSelect]);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;

    import("maplibre-gl").then((maplibre) => {
      if (cancelled || !containerRef.current) return;
      maplibre.setWorkerUrl(WORKER_URL);
      map = new maplibre.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        bounds: TORONTO_LNGLAT_BOUNDS,
        fitBoundsOptions: { padding: 16 },
        maxBounds: PANNING_BOUNDS,
        minZoom: 9,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      setLoaded({ map, maplibre });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const { map, maplibre } = loaded;
    const pins = pinsRef.current;

    const markers = incidents.filter(isLocated).map((incident) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-label",
        `${incident.title}. ${incident.location.raw || "Location confirmed on map"}`,
      );
      button.className = "block cursor-pointer p-1";
      const dot = document.createElement("span");
      dot.className = "block h-3.5 w-3.5 rounded-full border-2 border-paper transition-transform";
      dot.style.background = PRIORITY_TOKENS[incident.priority].dot;
      button.append(dot);

      const popupContent = document.createElement("div");
      popupContent.className = "min-w-52 p-1";

      const meta = document.createElement("div");
      meta.className = "mb-1 flex items-center gap-2";
      const priorityDot = document.createElement("span");
      priorityDot.className = "h-2 w-2 shrink-0 rounded-full";
      priorityDot.style.background = PRIORITY_TOKENS[incident.priority].dot;
      const incidentId = document.createElement("span");
      incidentId.className = "font-mono text-[10px] font-semibold uppercase text-muted";
      incidentId.textContent = displayId(incident.id, "INC");
      meta.append(priorityDot, incidentId);

      const title = document.createElement("p");
      title.className = "text-sm font-semibold leading-snug text-ink";
      title.textContent = incident.title;
      const location = document.createElement("p");
      location.className = "mt-1 text-xs leading-snug text-muted";
      location.textContent = incident.location.raw || "Confirmed map location";
      popupContent.append(meta, title, location);

      const popup = new maplibre.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        className: "relay-map-popup",
      })
        .setLngLat([incident.location.longitude, incident.location.latitude])
        .setDOMContent(popupContent);

      button.addEventListener("mouseenter", () => handlersRef.current.onHover(incident.id));
      button.addEventListener("mouseleave", () => handlersRef.current.onHover(null));
      button.addEventListener("focus", () => handlersRef.current.onHover(incident.id));
      button.addEventListener("blur", () => handlersRef.current.onHover(null));
      button.addEventListener("click", () => handlersRef.current.onSelect(incident.id));

      pins.set(incident.id, (active) => {
        // MapLibre owns the marker element's transform, so scale the inner dot instead.
        dot.style.transform = active ? "scale(1.4)" : "";
        dot.style.boxShadow = active ? `0 0 0 5px ${PRIORITY_TOKENS[incident.priority].bg}` : "";
        button.style.zIndex = active ? "1" : "";
        if (active) popup.addTo(map);
        else popup.remove();
      });
      return new maplibre.Marker({ element: button })
        .setLngLat([incident.location.longitude, incident.location.latitude])
        .addTo(map);
    });

    return () => {
      markers.forEach((marker) => marker.remove());
      for (const setActive of pins.values()) setActive(false);
      pins.clear();
    };
  }, [loaded, incidents]);

  useEffect(() => {
    for (const [id, setActive] of pinsRef.current) setActive(id === hoveredId);
  }, [hoveredId, loaded, incidents]);

  const unlocatedCount = incidents.filter((incident) => !isLocated(incident)).length;

  return (
    <div className="flex h-full flex-1 flex-col rounded-2xl bg-paper p-5 card-shadow">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">City map — click a hotspot for details</h2>
        <span className="font-mono text-[11px] font-semibold text-muted">{openCount} open</span>
      </div>
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-[#eef0e6]" />
      <div className="mt-3 flex items-center gap-4">
        {PRIORITY_ORDER.map((priority) => (
          <span key={priority} className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_TOKENS[priority].dot }} />
            {PRIORITY_TOKENS[priority].label}
          </span>
        ))}
        {unlocatedCount > 0 && (
          <span className="ml-auto text-[11px] font-medium text-muted">
            {unlocatedCount} without a confirmed location
          </span>
        )}
      </div>
    </div>
  );
}
