import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const transcriptMessageSchema = z.object({
  role: z.enum(["assistant", "user", "system", "tool"]),
  text: z.string(),
});

export const transcriptInputSchema = z.object({
  callId: z.string().min(1).max(200),
  transcript: z.string().min(1),
  messages: z.array(transcriptMessageSchema).default([]),
  endedReason: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  callerPhone: z.string().nullable().optional(),
});

export type TranscriptInput = z.infer<typeof transcriptInputSchema>;

export type SavedTranscript = TranscriptInput & {
  id: string;
  provider: "vapi";
  receivedAt: string;
  textFile: string;
};

const transcriptsDirectory = path.join(process.cwd(), "data", "transcripts");

const assistantLabels = new Set(["ai", "assistant", "relay311", "relay 311"]);
const callerLabels = new Set(["caller", "customer", "user"]);

export function conversationMessages(
  transcript: string,
  providerMessages: TranscriptInput["messages"] = [],
): TranscriptInput["messages"] {
  const messages: TranscriptInput["messages"] = [];

  for (const line of transcript.split(/\r?\n/)) {
    const match = line.match(/^([^:]{1,80}):\s*(.*)$/);
    if (!match) continue;

    const label = match[1].trim().toLowerCase();
    const text = match[2].trim();
    const role = assistantLabels.has(label)
      ? "assistant"
      : callerLabels.has(label)
        ? "user"
        : null;

    if (role && text) messages.push({ role, text });
  }

  const roles = new Set(messages.map((message) => message.role));
  if (roles.has("assistant") && roles.has("user")) return messages;

  return providerMessages.filter(
    (message) => message.role === "assistant" || message.role === "user",
  );
}

function safeCallId(callId: string) {
  return callId.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 200);
}

export async function saveTranscriptFile(
  input: TranscriptInput,
  directory = transcriptsDirectory,
): Promise<SavedTranscript> {
  const callId = safeCallId(input.callId);
  const receivedAt = new Date().toISOString();
  const textFile = `${callId}.txt`;
  const saved: SavedTranscript = {
    ...input,
    callId,
    id: `vapi-${callId}`,
    provider: "vapi",
    endedReason: input.endedReason ?? null,
    createdAt: input.createdAt ?? receivedAt,
    receivedAt,
    textFile,
    messages: conversationMessages(input.transcript, input.messages),
  };

  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, textFile), `${saved.transcript.trim()}\n`, "utf8"),
    writeFile(
      path.join(directory, `${callId}.json`),
      `${JSON.stringify(saved, null, 2)}\n`,
      "utf8",
    ),
  ]);

  return saved;
}

export async function listTranscriptFiles(directory = transcriptsDirectory): Promise<SavedTranscript[]> {
  try {
    const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
    const transcripts = await Promise.all(
      files.map(async (file) => {
        const contents = await readFile(path.join(directory, file), "utf8");
        return JSON.parse(contents) as SavedTranscript;
      }),
    );
    return transcripts.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}
