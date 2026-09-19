import IncidentQueueView from "@/components/incidents/IncidentQueueView";
import { getIncidents, getLinkedCallCounts } from "@/lib/db/incidents";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const [incidents, linkedCallCounts] = await Promise.all([getIncidents(), getLinkedCallCounts()]);
  return <IncidentQueueView incidents={incidents} linkedCallCounts={linkedCallCounts} />;
}
