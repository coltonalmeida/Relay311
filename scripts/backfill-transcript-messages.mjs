import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const transcriptsDirectory = path.join(process.cwd(), "data", "transcripts");
const assistantLabels = new Set(["ai", "assistant", "relay311", "relay 311"]);
const callerLabels = new Set(["caller", "customer", "user"]);

function conversationMessages(transcript) {
  return transcript.split(/\r?\n/).flatMap((line) => {
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
}

const files = (await readdir(transcriptsDirectory)).filter((file) => file.endsWith(".json"));
let updated = 0;

for (const file of files) {
  const filePath = path.join(transcriptsDirectory, file);
  const record = JSON.parse(await readFile(filePath, "utf8"));
  if (typeof record.transcript !== "string") continue;

  const messages = conversationMessages(record.transcript);
  const roles = new Set(messages.map((message) => message.role));
  if (!roles.has("assistant") || !roles.has("user")) continue;

  record.messages = messages;
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  updated += 1;
}

console.log(`Backfilled ${updated} transcript JSON file${updated === 1 ? "" : "s"}.`);
