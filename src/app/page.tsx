import HomeMapAndList from "@/components/home/HomeMapAndList";
import StatGrid, { type Stat } from "@/components/home/StatGrid";
import { getCalls } from "@/lib/db/calls";
import { getIncidents } from "@/lib/db/incidents";
import { formatDuration } from "@/lib/incident-heuristics";
import { OPEN_INCIDENT_STATUSES } from "@/lib/schemas";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const [incidents, calls] = await Promise.all([getIncidents(), getCalls()]);
  const openIncidents = incidents.filter((incident) => OPEN_INCIDENT_STATUSES.includes(incident.status));

  const today = new Date().toISOString().slice(0, 10);
  const callsToday = calls.filter((call) => call.createdAt.slice(0, 10) === today).length;

  const responded = incidents.filter((incident) => incident.status !== "new");
  const avgResponseMs =
    responded.length > 0
      ? responded.reduce(
          (sum, incident) => sum + (new Date(incident.updatedAt).getTime() - new Date(incident.createdAt).getTime()),
          0,
        ) / responded.length
      : null;

  const aiAutoResolved = calls.filter((call) => call.recordType === "information").length;

  const stats: Stat[] = [
    { label: "OPEN INCIDENTS", value: String(openIncidents.length) },
    { label: "CALLS TODAY", value: String(callsToday) },
    { label: "AVG RESPONSE", value: avgResponseMs === null ? "—" : formatDuration(avgResponseMs) },
    { label: "AI AUTO-RESOLVED", value: String(aiAutoResolved), accent: true },
  ];

  return (
    <div className="px-8 py-7">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-ink">
          {greeting()} — here&apos;s what&apos;s happening across the city.
        </h1>
        <p className="mt-1 text-sm text-muted">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} ·{" "}
          {callsToday} calls today
        </p>
      </div>
      <div className="mb-4">
        <StatGrid stats={stats} />
      </div>
      <HomeMapAndList incidents={openIncidents} />
    </div>
  );
}
