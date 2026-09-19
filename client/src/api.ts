import type { CallRecord, CreateCallResponse, IncidentRecord } from './types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export const api = {
  calls: () => request<CallRecord[]>('/api/calls'),
  incidents: () => request<IncidentRecord[]>('/api/incidents'),
  createCall: (externalCallId: string, transcript: string) =>
    request<CreateCallResponse>('/api/calls', { method: 'POST', body: JSON.stringify({ externalCallId, transcript }) }),
  updateIncident: (id: string, action: 'approve' | 'dismiss') =>
    request<IncidentRecord>(`/api/incidents/${id}/${action}`, { method: 'POST' }),
}
