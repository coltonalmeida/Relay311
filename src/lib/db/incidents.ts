import { findDuplicateCandidate, derivePriority, deriveTitle } from "../incident-heuristics";
import { OPEN_INCIDENT_STATUSES, type IncidentRecord, type StructuredReport } from "../schemas";
import { supabase } from "../supabase";

type Row = Record<string, unknown>;

function incidentFromRow(row: Row): IncidentRecord {
  return {
    id: row.id as string,
    callId: row.call_id as string,
    status: row.status as IncidentRecord["status"],
    title: row.title as string,
    category: row.category as IncidentRecord["category"],
    subtype: row.subtype as string,
    summary: row.summary as string,
    priority: row.priority as IncidentRecord["priority"],
    assignee: (row.assignee as string | null) ?? null,
    location: row.location as IncidentRecord["location"],
    observations: row.observations as IncidentRecord["observations"],
    confidence: row.confidence as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function getIncidents(): Promise<IncidentRecord[]> {
  const result = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
  check(result.error);
  return (result.data as Row[]).map(incidentFromRow);
}

export async function getOpenIncidents(): Promise<IncidentRecord[]> {
  const result = await supabase
    .from("incidents")
    .select("*")
    .in("status", OPEN_INCIDENT_STATUSES)
    .order("created_at", { ascending: false })
    .limit(200);
  check(result.error);
  return (result.data as Row[]).map(incidentFromRow);
}

export async function getIncident(id: string): Promise<IncidentRecord | null> {
  const result = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
  check(result.error);
  return result.data ? incidentFromRow(result.data as Row) : null;
}

export async function getLinkedCallCount(incidentId: string): Promise<number> {
  const result = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("incident_id", incidentId);
  check(result.error);
  return result.count ?? 0;
}

export async function getLinkedCallCounts(): Promise<Record<string, number>> {
  const result = await supabase.from("calls").select("incident_id").not("incident_id", "is", null);
  check(result.error);
  const counts: Record<string, number> = {};
  for (const row of result.data as Row[]) {
    const incidentId = row.incident_id as string;
    counts[incidentId] = (counts[incidentId] ?? 0) + 1;
  }
  return counts;
}

export async function createIncidentFromReport(callId: string, report: StructuredReport): Promise<IncidentRecord> {
  const inserted = await supabase
    .from("incidents")
    .insert({
      call_id: callId,
      status: "new",
      title: deriveTitle(report),
      category: report.category,
      subtype: report.subtype,
      summary: report.summary,
      priority: derivePriority(report),
      location: report.location,
      observations: report.observations,
      confidence: report.confidence,
    })
    .select("*")
    .single();
  check(inserted.error);
  return incidentFromRow(inserted.data as Row);
}

async function setStatus(id: string, status: "assigned" | "dismissed"): Promise<IncidentRecord | null> {
  const result = await supabase.from("incidents").update({ status }).eq("id", id).select("*").maybeSingle();
  check(result.error);
  return result.data ? incidentFromRow(result.data as Row) : null;
}

export function approveIncident(id: string): Promise<IncidentRecord | null> {
  return setStatus(id, "assigned");
}

export function dismissIncident(id: string): Promise<IncidentRecord | null> {
  return setStatus(id, "dismissed");
}

export async function mergeDuplicateIncidents(id: string): Promise<{ incident: IncidentRecord; mergedCount: number }> {
  const target = await getIncident(id);
  if (!target) throw new Error("Incident not found");

  const targetAsReport: StructuredReport = {
    intent: "",
    category: target.category,
    subtype: target.subtype,
    summary: target.summary,
    actionable: true,
    confidence: target.confidence,
    location: target.location,
    observations: target.observations,
  };

  const open = await getOpenIncidents();
  const matches = open.filter(
    (candidate) => candidate.id !== id && findDuplicateCandidate(targetAsReport, [candidate]) !== null,
  );

  for (const match of matches) {
    const relinked = await supabase.from("calls").update({ incident_id: id }).eq("incident_id", match.id);
    check(relinked.error);
    const dismissed = await supabase.from("incidents").update({ status: "dismissed" }).eq("id", match.id);
    check(dismissed.error);
  }

  const refreshed = await getIncident(id);
  if (!refreshed) throw new Error("Incident not found after merge");
  return { incident: refreshed, mergedCount: matches.length };
}
