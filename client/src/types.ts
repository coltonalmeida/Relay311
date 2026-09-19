export type RecordType = 'incident' | 'information' | null
export type IncidentStatus = 'pending' | 'approved' | 'dismissed'

export interface Report {
  intent: string
  category: string
  subtype: string
  summary: string
  actionable: boolean
  confidence: number
  location: { raw: string; latitude?: number; longitude?: number }
  observations: Record<string, boolean | string | number>
}

export interface CallRecord {
  id: string
  externalCallId: string
  transcript: string
  startedAt: string | null
  durationSeconds: number | null
  provider: string | null
  providerRecordId: string | null
  phoneNumberId: string | null
  assistantId: string | null
  providerStatus: string | null
  endedReason: string | null
  providerCreatedAt: string | null
  endedAt: string | null
  receivedAt: string | null
  textFile: string | null
  processingStatus: string
  processingError: string | null
  recordType: RecordType
  report: Report | null
  incidentId: string | null
  createdAt: string
  updatedAt: string
}

export interface IncidentRecord {
  id: string
  callId: string
  status: IncidentStatus
  category: string
  subtype: string
  summary: string
  location: Report['location']
  observations: Record<string, boolean | string | number>
  confidence: number
  createdAt: string
  updatedAt: string
}

export interface CreateCallResponse { call: CallRecord; incident: IncidentRecord | null }
