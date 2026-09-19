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
