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

Transcript processing is currently a deterministic local placeholder. It is
isolated in `server/services/transcriptProcessor.ts` so Gemini can replace it
later without changing the HTTP or database layers.

## API

- `POST /api/calls`
- `GET /api/calls`
- `GET /api/calls/:id`
- `GET /api/incidents`
- `GET /api/incidents/:id`
- `POST /api/incidents/:id/approve`
- `POST /api/incidents/:id/dismiss`
