import { readFile } from "node:fs/promises";
import path from "node:path";

const apiKey = process.env.VAPI_PRIVATE_API_KEY;
const assistantId = process.env.VAPI_ASSISTANT_ID;

if (!apiKey || !assistantId) {
  console.error("VAPI_PRIVATE_API_KEY and VAPI_ASSISTANT_ID are required in .env.local.");
  process.exit(1);
}

const prompt = await readFile(
  path.join(process.cwd(), "config", "vapi-311-system-prompt.txt"),
  "utf8",
);
const headers = {
  authorization: `Bearer ${apiKey}`,
  "content-type": "application/json",
};

const currentResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, { headers });
if (!currentResponse.ok) {
  throw new Error(`Unable to read Vapi assistant (${currentResponse.status}): ${await currentResponse.text()}`);
}
const current = await currentResponse.json();

const update = {
  name: "Relay311 Operator",
  firstMessage:
    "Hello, you've reached Relay311, the AI municipal service intake line. If anyone is in immediate danger, hang up and call 911. What municipal issue are you reporting today?",
  model: {
    ...current.model,
    temperature: 0.2,
    messages: [{ role: "system", content: prompt.trim() }],
  },
  artifactPlan: {
    ...current.artifactPlan,
    transcriptPlan: {
      ...current.artifactPlan?.transcriptPlan,
      enabled: true,
      assistantName: "Relay311",
      userName: "Caller",
    },
  },
  endCallMessage: "Thank you for calling Relay311. Your report has been recorded. Goodbye for now.",
  endCallPhrases: ["goodbye for now"],
  silenceTimeoutSeconds: 20,
  maxDurationSeconds: 90,
};

const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify(update),
});
if (!updateResponse.ok) {
  throw new Error(`Unable to update Vapi assistant (${updateResponse.status}): ${await updateResponse.text()}`);
}

const assistant = await updateResponse.json();
console.log(`Configured ${assistant.name} (${assistant.id}) with the Relay311 intake prompt.`);
