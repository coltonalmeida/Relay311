import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.VAPI_PRIVATE_API_KEY;
const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
const assistantId = process.env.VAPI_ASSISTANT_ID;
const outputDirectory = path.join(process.cwd(), "data", "transcripts");
const once = process.argv.includes("--once");
const pollIntervalMs = 5_000;

if (!apiKey) {
  console.error(
    "Missing VAPI_PRIVATE_API_KEY. Rotate the exposed key, then put the replacement in .env.",
  );
  process.exit(1);
}

if (!phoneNumberId) {
  console.error("Missing VAPI_PHONE_NUMBER_ID in .env.");
  process.exit(1);
}

function safeCallId(callId) {
  return callId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 200);
}

function conversationMessages(call, transcript) {
  const assistantLabels = new Set(["ai", "assistant", "relay311", "relay 311"]);
  const callerLabels = new Set(["caller", "customer", "user"]);
  const messages = transcript.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^:]{1,80}):\s*(.*)$/);
    if (!match) return [];

    const label = match[1].trim().toLowerCase();
    const text = match[2].trim();
    const role = assistantLabels.has(label)
      ? "assistant"
      : callerLabels.has(label)
        ? "user"
        : null;
    return role && text ? [{ role, text }] : [];
  });

  const roles = new Set(messages.map((message) => message.role));
  if (roles.has("assistant") && roles.has("user")) return messages;

  const source = call.artifact?.messages ?? call.messages ?? [];
  return source.flatMap((message) => {
    const role = message?.role;
    const text = message?.message ?? message?.content;
    return ["assistant", "user"].includes(role) && typeof text === "string"
      ? [{ role, text }]
      : [];
  });
}

async function vapiGet(resource) {
  const response = await fetch(`https://api.vapi.ai${resource}`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Vapi request failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function existingCallIds() {
  await mkdir(outputDirectory, { recursive: true });
  const files = await readdir(outputDirectory);
  return new Set(files.filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)));
}

async function saveCall(call) {
  const callId = safeCallId(call.id);
  const transcript = call.artifact?.transcript;
  if (!transcript?.trim()) return false;

  const record = {
    id: `vapi-${callId}`,
    provider: "vapi",
    callId,
    phoneNumberId: call.phoneNumberId ?? phoneNumberId,
    assistantId: call.assistantId ?? assistantId ?? null,
    status: call.status ?? "ended",
    endedReason: call.endedReason ?? null,
    createdAt: call.createdAt,
    startedAt: call.startedAt ?? null,
    endedAt: call.endedAt ?? null,
    receivedAt: new Date().toISOString(),
    transcript,
    messages: conversationMessages(call, transcript),
    textFile: `${callId}.txt`,
  };

  await Promise.all([
    writeFile(path.join(outputDirectory, record.textFile), `${transcript.trim()}\n`, "utf8"),
    writeFile(
      path.join(outputDirectory, `${callId}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      "utf8",
    ),
  ]);
  console.log(`Saved transcript ${record.textFile}`);
  return true;
}

async function syncTranscripts(seen) {
  const query = new URLSearchParams({ limit: "100", phoneNumberId });
  if (assistantId) query.set("assistantId", assistantId);

  const calls = await vapiGet(`/call?${query}`);
  const endedCalls = calls.filter((call) => call.status === "ended" && !seen.has(safeCallId(call.id)));

  for (const listedCall of endedCalls) {
    const call = listedCall.artifact?.transcript
      ? listedCall
      : await vapiGet(`/call/${encodeURIComponent(listedCall.id)}`);
    if (await saveCall(call)) seen.add(safeCallId(call.id));
  }
}

const seen = await existingCallIds();
console.log("Watching Vapi number +1 (716) 229-8011 for completed calls…");

do {
  try {
    await syncTranscripts(seen);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (once) process.exitCode = 1;
  }
  if (!once) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
} while (!once);
