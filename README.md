# Relay311

Relay311 is a hackathon backend for turning municipal 311 call transcripts into
structured call records and, when appropriate, actionable incidents for an
operator dashboard.

## Backend setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and add the Supabase project URL and service-role key.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Start the API with `npm run dev`.

The API listens on port 3000 by default. Use `npm run typecheck`, `npm test`, and
`npm run build` to verify it.

## Call processing

`POST /api/calls` accepts an `externalCallId`, a raw `transcript`, and optional
`startedAt` and `durationSeconds` fields. It stores the raw call, processes the
transcript, saves the structured report, and creates a linked incident only when
the report is actionable.

The response includes `recordType: "incident" | "information"`, allowing the
frontend to distinguish incident reports from call-history-only records.

Transcript processing uses Gemini structured output when `GEMINI_API_KEY` is
configured. The result is validated with the shared Zod schema before it is
stored or used to create an incident. `TRANSCRIPT_PROCESSOR=mock` enables the
deterministic offline classifier for local development and automated tests.

The default Gemini model is `gemini-3.5-flash-lite`. You can change the model,
request timeout, and maximum attempts with the variables documented in
`.env.example`. Gemini failures mark the stored call as `failed` and save a
`processingError`; they do not create an incident from uncertain data.

## Integration contracts

Colton's Vapi integration should send a completed call to `POST /api/calls`:

```json
{
  "externalCallId": "provider-call-id",
  "transcript": "The complete raw transcript",
  "startedAt": "2026-09-19T15:30:00.000Z",
  "durationSeconds": 74
}
```

Only `externalCallId` and `transcript` are required. The external ID must be
unique, so webhook retries with the same ID will not create duplicate calls.
This is ingestion idempotency, not municipal incident duplicate detection.

Mark's dashboard can use `recordType` to separate incident calls from
information-only history. A processed actionable call has an `incidentId` and
the create response includes the new `incident`; an informational call returns
`incident: null`. Failed calls expose `processingStatus: "failed"` and a
`processingError` for operator visibility.

## API

- `POST /api/calls`
- `GET /api/calls`
- `GET /api/calls/:id`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents/:id/approve`
- `POST /api/incidents/:id/dismiss`
