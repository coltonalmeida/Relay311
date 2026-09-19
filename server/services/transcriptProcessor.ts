import { StructuredReportSchema, type StructuredReport } from '../../shared/schemas.js';

/** Deterministic local placeholder. Keep this interface stable when adding an LLM provider. */
export function processTranscript(transcript: string): StructuredReport {
  const text = transcript.trim();
  const normalized = text.toLowerCase();
  const actionable = /\b(pothole|broken|leak|flood|outage|fallen|hazard|damage|dumping|graffiti|noise complaint|urgent|dangerous)\b/.test(normalized);
  const category = /\bpothole\b/.test(normalized) ? 'roads'
    : /\b(leak|flood|water main)\b/.test(normalized) ? 'water'
      : /\b(outage|streetlight|power)\b/.test(normalized) ? 'utilities'
        : actionable ? 'public-realm' : 'general-information';
  const report: StructuredReport = {
    intent: actionable ? 'Report a municipal issue' : 'Request general information',
    category,
    subtype: actionable ? 'service-request' : 'information-request',
    summary: text.length > 240 ? `${text.slice(0, 237)}...` : text,
    actionable,
    confidence: 0.72,
    location: { raw: '' },
    observations: { mockProcessor: true, transcriptLength: text.length }
  };
  return StructuredReportSchema.parse(report);
}
