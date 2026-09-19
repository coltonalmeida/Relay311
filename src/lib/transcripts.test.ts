import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listTranscriptFiles, saveTranscriptFile } from "./transcripts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    force: true,
    recursive: true,
  })));
});

describe("Vapi transcript files", () => {
  it("writes readable text and structured JSON for a completed call", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "relay311-transcript-"));
    temporaryDirectories.push(directory);

    const saved = await saveTranscriptFile({
      callId: "call/test:123",
      transcript: "assistant: How can I help?\nuser: A streetlight is out.",
      messages: [
        { role: "assistant", text: "How can I help?" },
        { role: "user", text: "A streetlight is out." },
      ],
      endedReason: "customer-ended-call",
      createdAt: "2026-09-19T15:00:00.000Z",
    }, directory);

    expect(saved.callId).toBe("call-test-123");
    await expect(readFile(path.join(directory, saved.textFile), "utf8"))
      .resolves.toBe("assistant: How can I help?\nuser: A streetlight is out.\n");

    const listed = await listTranscriptFiles(directory);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: "vapi-call-test-123",
      provider: "vapi",
      endedReason: "customer-ended-call",
    });
  });
});
