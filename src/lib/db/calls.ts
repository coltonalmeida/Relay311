import { findDuplicateCandidate } from "../incident-heuristics";
import type { CallRecord, CreateCallInput, IncidentRecord } from "../schemas";
import { supabase } from "../supabase";
import { processTranscript } from "../transcript-processor";
import { createIncidentFromReport, getOpenIncidents } from "./incidents";

type Row = Record<string, unknown>;

function callFromRow(row: Row): CallRecord {
  return {
    id: row.id as string,
    externalCallId: row.external_call_id as string,
    transcript: row.transcript as string,
    messages: (row.messages as CallRecord["messages"]) ?? [],
    callerPhone: (row.caller_phone as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    durationSeconds: (row.duration_seconds as number | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    providerRecordId: (row.provider_record_id as string | null) ?? null,
    phoneNumberId: (row.phone_number_id as string | null) ?? null,
    assistantId: (row.assistant_id as string | null) ?? null,
    providerStatus: (row.provider_status as string | null) ?? null,
    endedReason: (row.ended_reason as string | null) ?? null,
    providerCreatedAt: (row.provider_created_at as string | null) ?? null,
    endedAt: (row.ended_at as string | null) ?? null,
    receivedAt: (row.received_at as string | null) ?? null,
    textFile: (row.text_file as string | null) ?? null,
    processingStatus: row.processing_status as CallRecord["processingStatus"],
    processingError: (row.processing_error as string | null) ?? null,
    recordType: (row.record_type as CallRecord["recordType"]) ?? null,
    report: (row.report as CallRecord["report"]) ?? null,
    incidentId: (row.incident_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function getCalls(): Promise<CallRecord[]> {
  const result = await supabase.from("calls").select("*").order("created_at", { ascending: false });
  check(result.error);
  return (result.data as Row[]).map(callFromRow);
}

export async function getCall(id: string): Promise<CallRecord | null> {
  const result = await supabase.from("calls").select("*").eq("id", id).maybeSingle();
  check(result.error);
  return result.data ? callFromRow(result.data as Row) : null;
}

export async function getLinkedCalls(incidentId: string): Promise<CallRecord[]> {
  const result = await supabase
    .from("calls")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });
  check(result.error);
  return (result.data as Row[]).map(callFromRow);
}

export type ClassifiedCallResult = {
  call: CallRecord;
  incident: IncidentRecord | null;
  linkedExistingIncident: boolean;
};

export async function createCallWithClassification(input: CreateCallInput): Promise<ClassifiedCallResult> {
  const inserted = await supabase
    .from("calls")
    .insert({
      external_call_id: input.externalCallId,
      transcript: input.transcript,
      messages: input.messages,
      caller_phone: input.callerPhone ?? null,
      started_at: input.startedAt ?? null,
      duration_seconds: input.durationSeconds ?? null,
      provider: input.provider ?? null,
      provider_record_id: input.providerRecordId ?? null,
      phone_number_id: input.phoneNumberId ?? null,
      assistant_id: input.assistantId ?? null,
      provider_status: input.providerStatus ?? null,
      ended_reason: input.endedReason ?? null,
      ended_at: input.endedAt ?? null,
      text_file: input.textFile ?? null,
      processing_status: "processing",
    })
    .select("*")
    .single();
  check(inserted.error);
  const rawCall = inserted.data as Row;
  const rawCallId = rawCall.id as string;

  try {
    const report = await processTranscript(input.transcript);
    let incident: IncidentRecord | null = null;
    let linkedExistingIncident = false;

    if (report.actionable) {
      const openIncidents = await getOpenIncidents();
      const duplicate = findDuplicateCandidate(report, openIncidents);
      if (duplicate) {
        incident = duplicate;
        linkedExistingIncident = true;
      } else {
        incident = await createIncidentFromReport(rawCallId, report);
      }
    }

    const updated = await supabase
      .from("calls")
      .update({
        report,
        record_type: report.actionable ? "incident" : "information",
        incident_id: incident?.id ?? null,
        processing_status: "processed",
      })
      .eq("id", rawCallId)
      .select("*")
      .single();
    check(updated.error);

    return { call: callFromRow(updated.data as Row), incident, linkedExistingIncident };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcript processing error";
    await supabase
      .from("calls")
      .update({ processing_status: "failed", processing_error: message })
      .eq("id", rawCallId);
    throw error;
  }
}
