<<<<<<< HEAD
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

Colton's Vapi integration can send its completed-call output directly to
`POST /api/calls`:

```json
{
  "id": "vapi-provider-record-id",
  "provider": "vapi",
  "callId": "provider-call-id",
  "phoneNumberId": "phone-number-id",
  "assistantId": "assistant-id",
  "status": "ended",
  "endedReason": "customer-ended-call",
  "createdAt": "2026-09-19T15:29:59.000Z",
  "transcript": "The complete raw transcript",
  "startedAt": "2026-09-19T15:30:00.000Z",
  "endedAt": "2026-09-19T15:31:14.000Z",
  "receivedAt": "2026-09-19T15:31:20.000Z",
  "messages": [],
  "textFile": "provider-call-id.txt"
}
```

The backend maps `callId` to its unique external call ID and derives duration
from `startedAt` and `endedAt`. It stores useful Vapi metadata but deliberately
does not persist `messages`; the canonical `transcript` is what Gemini processes.
Unknown Vapi fields are tolerated so minor provider additions do not break the
webhook. The original normalized development payload remains supported.

The external call ID is unique, so webhook retries with the same ID will not
create duplicate calls. This is ingestion protection, not municipal incident
duplicate detection.

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
=======
# Relay311 voice ingestion

Person 1 currently stops at transcription:

1. Call **+1 (716) 229-8011**.
2. Vapi's `Relay311 Operator` assistant answers and transcribes the conversation.
3. The local watcher downloads completed transcripts into `data/transcripts/` as both `.txt` and `.json`.

## Run

Start the watcher before placing a call:

```bash
npm run transcripts:watch
```

Hang up when finished. Within a few seconds, the watcher prints the saved filename. To fetch completed calls once and exit instead, run:

```bash
npm run transcripts:sync
```

Vapi credentials and IDs live in the Git-ignored `.env.local` file. Never prefix the private key with `NEXT_PUBLIC_` and never commit `.env.local`.

The assistant's source-controlled system prompt is in `config/vapi-311-system-prompt.txt`. After editing it, push the new prompt to Vapi with:

```bash
npm run vapi:configure
```

The Next.js route at `POST /api/vapi/webhook` is also ready for a future public deployment or HTTPS tunnel. It is optional while using the watcher.
>>>>>>> origin/main
