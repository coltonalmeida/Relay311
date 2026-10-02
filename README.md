# Relay311

**Voice-based 311 reporting and incident triage for city teams.** Relay311 turns residents' non-emergency calls into structured service requests, helping operators spot urgent issues and review related reports in one place. The project placed **5th at the Future Legends Hackathon, UofT edition**.

[View the Devpost submission](https://devpost.com/software/relay311)

## How it works

1. A resident describes a municipal issue to the Vapi voice assistant.
2. Relay311 saves the transcript and classifies the call. With a Gemini API key, it extracts a category, summary, location, and other reported details; without one, a basic mock classifier is available for development.
3. Actionable calls become incidents with a derived priority. Informational calls remain in call history without creating an incident.
4. A new report that matches a recent, open incident is linked to that incident instead of creating another one.
5. Operators review incidents, transcripts, and linked calls in the dashboard. Its home screen shows incident counts and a city map; separate views show the incident queue, call history, and an in-progress call.

Relay311 is designed to support human review of 311 reports, not to dispatch emergency services or replace a city's existing 311 system.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Vapi, Gemini, Supabase/PostgreSQL, MapLibre GL with OpenFreeMap tiles, Zod, and Vitest.

## Run a local demo

**Prerequisites:** Node.js 20.9+, npm, and a Supabase project. The seeded demo does not need Vapi or Gemini credentials.

1. Install dependencies and copy the environment template:

   ```bash
   npm ci
   cp .env.example .env
   ```

2. Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase project's SQL Editor. Add these **server-side** values to `.env`:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Keep the service role key private. Do not prefix it with `NEXT_PUBLIC_` or commit `.env`.

3. Load sample calls and incidents, then start the app:

   ```bash
   npm run seed
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to explore the home map, incident queue, incident details, and call history. The seed command replaces only its own demo records. Run `npm run seed:clear` to remove them.

## Connect live calls

To classify real Vapi calls with Gemini, add `GEMINI_API_KEY` to `.env`; the app selects Gemini automatically when a key is present. Set `TRANSCRIPT_PROCESSOR=gemini` if you want a missing key to cause an error instead of selecting the rule-based mock processor. See [`.env.example`](.env.example) for the Vapi settings:

- `VAPI_PRIVATE_API_KEY`, `VAPI_ASSISTANT_ID`, and `VAPI_PHONE_NUMBER_ID` identify your Vapi assistant and inbound number.
- `APP_PUBLIC_URL` is a public HTTPS origin that Vapi can reach. The app receives events at `POST /api/vapi/webhook`.
- `VAPI_WEBHOOK_SECRET` secures that webhook through Vapi's `x-vapi-secret` header.
- `GEOCODER_CONTACT_EMAIL` supplies a contact address for location lookups through OpenStreetMap Nominatim.

Assign the assistant to your Vapi number, set `APP_PUBLIC_URL` and `VAPI_WEBHOOK_SECRET` in `.env`, then run `npm run vapi:configure` to publish the intake prompt and webhook settings to Vapi. When a call ends, the webhook saves its transcript, classifies it, and writes the call and any incident to Supabase. The live-call screen uses webhook events while a call is in progress.

For **file-only transcript collection**, run `npm run transcripts:watch` before calling, or `npm run transcripts:sync` to fetch completed calls once. These commands save `.txt` and `.json` files under `data/transcripts/`; they do **not** populate the dashboard. The webhook is required for the end-to-end call-to-incident flow. The source-controlled assistant prompt is in [`config/vapi-311-system-prompt.txt`](config/vapi-311-system-prompt.txt).

## Project status

Relay311 is a hackathon prototype. The map, transcript processing, duplicate linking, and dashboard are implemented; integration with municipal service systems is not. Future work described on [Devpost](https://devpost.com/software/relay311) includes location clustering, department routing, unresolved-issue alerts, broader analytics, and better support for non-native speakers.

## Team and license

Created by Colton Almeida, Benjamin Probert, and Mark Chen for the Future Legends Hackathon. Released under the [MIT license](LICENSE).
