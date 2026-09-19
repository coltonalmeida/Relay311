import type { CallRecord, CreateCallInput, IncidentRecord, StructuredReport } from '../../shared/schemas.js';
import { supabase } from './supabase.js';
import { processTranscript } from './transcriptProcessor.js';

type Row = Record<string, any>;
const callFromRow = (r: Row): CallRecord => ({
  id: r.id, externalCallId: r.external_call_id, transcript: r.transcript,
  startedAt: r.started_at, durationSeconds: r.duration_seconds,
  provider: r.provider, providerRecordId: r.provider_record_id,
  phoneNumberId: r.phone_number_id, assistantId: r.assistant_id,
  providerStatus: r.provider_status, endedReason: r.ended_reason,
  providerCreatedAt: r.provider_created_at, endedAt: r.ended_at,
  receivedAt: r.received_at, textFile: r.text_file,
  processingStatus: r.processing_status, processingError: r.processing_error ?? null, recordType: r.record_type,
  report: r.report as StructuredReport | null, incidentId: r.incident_id,
  createdAt: r.created_at, updatedAt: r.updated_at
});
const incidentFromRow = (r: Row): IncidentRecord => ({
  id: r.id, callId: r.call_id, status: r.status, category: r.category,
  subtype: r.subtype, summary: r.summary, location: r.location,
  observations: r.observations, confidence: r.confidence,
  createdAt: r.created_at, updatedAt: r.updated_at
});
function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function createCall(input: CreateCallInput): Promise<{ call: CallRecord; incident: IncidentRecord | null }> {
  const inserted = await supabase.from('calls').insert({
    external_call_id: input.externalCallId,
    transcript: input.transcript,
    started_at: input.startedAt ?? null,
    duration_seconds: input.durationSeconds ?? null,
    provider: input.provider ?? null,
    provider_record_id: input.providerRecordId ?? null,
    phone_number_id: input.phoneNumberId ?? null,
    assistant_id: input.assistantId ?? null,
    provider_status: input.providerStatus ?? null,
    ended_reason: input.endedReason ?? null,
    provider_created_at: input.providerCreatedAt ?? null,
    ended_at: input.endedAt ?? null,
    received_at: input.receivedAt ?? null,
    text_file: input.textFile ?? null,
    processing_status: 'processing'
  }).select('*').single();
  check(inserted.error);
  const rawCall = inserted.data as Row;
  try {
    const report = await processTranscript(input.transcript);
    let incident: IncidentRecord | null = null;
    if (report.actionable) {
      const created = await supabase.from('incidents').insert({
        call_id: rawCall.id, status: 'pending', category: report.category,
        subtype: report.subtype, summary: report.summary, location: report.location,
        observations: report.observations, confidence: report.confidence
      }).select('*').single();
      check(created.error);
      incident = incidentFromRow(created.data as Row);
    }
    const updated = await supabase.from('calls').update({
      report, record_type: report.actionable ? 'incident' : 'information',
      incident_id: incident?.id ?? null, processing_status: 'processed'
    }).eq('id', rawCall.id).select('*').single();
    check(updated.error);
    return { call: callFromRow(updated.data as Row), incident };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transcript processing error';
    const failed = await supabase.from('calls').update({ processing_status: 'failed', processing_error: message }).eq('id', rawCall.id);
    if (failed.error?.message.includes('processing_error')) {
      await supabase.from('calls').update({ processing_status: 'failed' }).eq('id', rawCall.id);
    }
    throw error;
  }
}

export async function getCalls(): Promise<CallRecord[]> {
  const result = await supabase.from('calls').select('*').order('created_at', { ascending: false });
  check(result.error);
  return (result.data as Row[]).map(callFromRow);
}
export async function getCall(id: string): Promise<CallRecord | null> {
  const result = await supabase.from('calls').select('*').eq('id', id).maybeSingle();
  check(result.error);
  return result.data ? callFromRow(result.data as Row) : null;
}
export async function getIncidents(): Promise<IncidentRecord[]> {
  const result = await supabase.from('incidents').select('*').order('created_at', { ascending: false });
  check(result.error);
  return (result.data as Row[]).map(incidentFromRow);
}
export async function getIncident(id: string): Promise<IncidentRecord | null> {
  const result = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
  check(result.error);
  return result.data ? incidentFromRow(result.data as Row) : null;
}
export async function setIncidentStatus(id: string, status: 'approved' | 'dismissed'): Promise<IncidentRecord | null> {
  const result = await supabase.from('incidents').update({ status }).eq('id', id).select('*').maybeSingle();
  check(result.error);
  return result.data ? incidentFromRow(result.data as Row) : null;
}
