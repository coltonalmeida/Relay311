import { FormEvent, useEffect, useState } from 'react'
import { api } from './api'
import type { CallRecord, CreateCallResponse, IncidentRecord, Report } from './types'

const pothole = 'There is a large pothole in the eastbound lane outside 123 Main Street. Cars are swerving to avoid it.'
const hours = 'What are the opening hours for the downtown community centre this Saturday?'
const id = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const date = (value: string) => new Date(value).toLocaleString()

function ReportDetails({ report }: { report: Report | null }) {
  if (!report) return <span className="muted">No structured report</span>
  return <dl className="details">
    <div><dt>Intent</dt><dd>{report.intent}</dd></div><div><dt>Category</dt><dd>{report.category} / {report.subtype}</dd></div>
    <div><dt>Actionable</dt><dd>{String(report.actionable)}</dd></div><div><dt>Confidence</dt><dd>{report.confidence}</dd></div>
    <div><dt>Location</dt><dd>{report.location.raw || 'Not provided'}</dd></div><div><dt>Observations</dt><dd>{Object.keys(report.observations).length ? JSON.stringify(report.observations) : 'None'}</dd></div>
    <div className="wide"><dt>Summary</dt><dd>{report.summary}</dd></div>
  </dl>
}

export default function App() {
  const [externalCallId, setExternalCallId] = useState(id)
  const [transcript, setTranscript] = useState('')
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mutating, setMutating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateCallResponse | null>(null)

  const refresh = async () => {
    setLoading(true); setError(null)
    try { const [nextCalls, nextIncidents] = await Promise.all([api.calls(), api.incidents()]); setCalls(nextCalls); setIncidents(nextIncidents) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load dashboard data.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(null); setResult(null)
    try { const created = await api.createCall(externalCallId, transcript); setResult(created); setTranscript(''); setExternalCallId(id()); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not submit call.') }
    finally { setSubmitting(false) }
  }
  const decide = async (incidentId: string, action: 'approve' | 'dismiss') => {
    setMutating(incidentId); setError(null)
    try { await api.updateIncident(incidentId, action); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update incident.') }
    finally { setMutating(null) }
  }

  return <main>
    <header><h1>Relay311 test dashboard</h1><p>Submit a caller transcript, inspect classification, and triage generated incidents.</p></header>
    <section className="panel" aria-labelledby="submit-title"><div className="section-head"><h2 id="submit-title">Submit a call</h2></div>
      <form onSubmit={submit}><label htmlFor="call-id">External call ID</label><input id="call-id" value={externalCallId} onChange={e => setExternalCallId(e.target.value)} required />
        <label htmlFor="transcript">Transcript</label><textarea id="transcript" value={transcript} onChange={e => setTranscript(e.target.value)} required rows={5} placeholder="Paste or type a caller transcript" />
        <div className="actions"><button type="button" onClick={() => setTranscript(pothole)}>Use pothole example</button><button type="button" onClick={() => setTranscript(hours)}>Use hours example</button><button className="primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit call'}</button></div>
      </form>
      {result && <p className="notice">Created as <strong>{result.incident ? 'Incident' : 'Information / Call History'}</strong>{result.incident ? ` — ${result.incident.summary}` : ` — ${result.call.report?.summary ?? 'processed'}`}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    <div className="section-head"><h2>Calls</h2><button onClick={() => void refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh lists'}</button></div>
    <section className="list" aria-live="polite">{loading ? <p>Loading calls…</p> : calls.length === 0 ? <p className="muted">No calls yet.</p> : calls.map(call => <article className="panel" key={call.id}><div className="card-head"><h3>{call.recordType === 'incident' ? 'Incident call' : call.recordType === 'information' ? 'Information call' : 'Unclassified call'}</h3><span>{call.processingStatus}</span></div><p><strong>{call.externalCallId}</strong> · {date(call.createdAt)} · ID: {call.id}</p><p className="transcript">{call.transcript}</p><ReportDetails report={call.report} /></article>)}</section>
    <div className="section-head"><h2>Incidents</h2></div>
    <section className="list" aria-live="polite">{loading ? <p>Loading incidents…</p> : incidents.length === 0 ? <p className="muted">No incidents yet.</p> : incidents.map(incident => <article className="panel" key={incident.id}><div className="card-head"><h3>{incident.category} / {incident.subtype}</h3><span className={`status ${incident.status}`}>{incident.status}</span></div><p>{incident.summary}</p><p><strong>Confidence:</strong> {incident.confidence} · <strong>Location:</strong> {incident.location.raw || 'Not provided'}</p><div className="actions"><button onClick={() => void decide(incident.id, 'approve')} disabled={incident.status !== 'pending' || mutating === incident.id}>{mutating === incident.id ? 'Saving…' : 'Approve'}</button><button onClick={() => void decide(incident.id, 'dismiss')} disabled={incident.status !== 'pending' || mutating === incident.id}>Dismiss</button></div></article>)}</section>
  </main>
}
