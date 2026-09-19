import { notFound } from "next/navigation";
import DetailView from "@/components/incidents/DetailView";
import { getCall, getLinkedCalls } from "@/lib/db/calls";
import { getIncident } from "@/lib/db/incidents";
import { buildActivityTimeline } from "@/lib/incident-heuristics";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();

  const [primaryCall, allLinkedCalls] = await Promise.all([getCall(incident.callId), getLinkedCalls(incident.id)]);
  const linkedCalls = allLinkedCalls.filter((call) => call.id !== incident.callId);
  const activity = buildActivityTimeline(incident, primaryCall?.createdAt ?? null);

  return <DetailView incident={incident} primaryCall={primaryCall} linkedCalls={linkedCalls} activity={activity} />;
}
