import { GoogleGenAI } from "@google/genai";
import { CategorySchema, StructuredReportSchema, type StructuredReport } from "./schemas";

export type TranscriptProcessorMode = "gemini" | "mock";

const CATEGORY_VALUES = CategorySchema.options;

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", description: "The caller primary intent in a short phrase." },
    category: {
      type: "string",
      enum: CATEGORY_VALUES,
      description: "The municipal service category. Use 'other' when nothing else fits.",
    },
    subtype: { type: "string", description: "Specific issue or information subtype in lowercase kebab-case." },
    summary: { type: "string", description: "One concise, factual operator-facing summary." },
    actionable: {
      type: "boolean",
      description: "True only when municipal staff should investigate, repair, clean, enforce, or otherwise act.",
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    location: {
      type: "object",
      additionalProperties: false,
      properties: {
        raw: { type: "string", description: "Location exactly as described, or empty when none was provided." },
        latitude: { type: "number", minimum: -90, maximum: 90 },
        longitude: { type: "number", minimum: -180, maximum: 180 },
      },
      required: ["raw"],
    },
    observations: {
      type: "object",
      description: "Relevant facts from the transcript. Never invent details.",
      additionalProperties: { anyOf: [{ type: "boolean" }, { type: "string" }, { type: "number" }] },
    },
  },
  required: ["intent", "category", "subtype", "summary", "actionable", "confidence", "location", "observations"],
} as const;

const systemInstruction = `You classify municipal 311 call transcripts for an operator dashboard, including transcripts of calls still in progress.

An actionable call reports a specific condition that municipal staff may need to investigate, repair, clean up, enforce, or route as a service request. Examples include potholes, damaged signs, flooding, broken streetlights, missed collection, graffiti, hazards, or a concrete bylaw complaint.

An informational call only asks for facts, schedules, rules, directions, contact information, eligibility, or service hours and does not report a condition requiring municipal action.

category must be exactly one of: ${CATEGORY_VALUES.join(", ")}. Use "other" when the report does not clearly match any of the other categories.

Base every field only on the transcript. Do not invent an address, coordinates, severity, cause, or observation. Use an empty location.raw when no location is stated. Only include coordinates if the caller explicitly provides coordinates. Confidence expresses classification confidence, not issue severity.`;

export function processTranscriptMock(transcript: string): StructuredReport {
  const text = transcript.trim();
  const normalized = text.toLowerCase();
  const actionable =
    /\b(pothole|broken|leak|flood|outage|fallen|hazard|damage|dumping|graffiti|noise complaint|urgent|dangerous)\b/.test(
      normalized,
    );

  const category = /\bpothole\b/.test(normalized)
    ? "pothole"
    : /\b(fallen tree|downed tree|\btree\b)/.test(normalized)
      ? "tree"
      : /\b(leak|flood|water main)\b/.test(normalized)
        ? "water"
        : /\bdumping\b/.test(normalized)
          ? "dumping"
          : /\bgraffiti\b/.test(normalized)
            ? "graffiti"
            : /\b(abandoned vehicle|derelict vehicle)\b/.test(normalized)
              ? "vehicle"
              : /\bnoise\b/.test(normalized)
                ? "noise"
                : /\b(streetlight|street light|outage|power)\b/.test(normalized)
                  ? "streetlight"
                  : "other";

  return StructuredReportSchema.parse({
    intent: actionable ? "Report a municipal issue" : "Request general information",
    category,
    subtype: actionable ? "service-request" : "information-request",
    summary: text.length > 240 ? `${text.slice(0, 237)}...` : text,
    actionable,
    confidence: 0.72,
    location: { raw: "" },
    observations: { mockProcessor: true, transcriptLength: text.length },
  });
}

function configuredMode(): TranscriptProcessorMode {
  const value = process.env.TRANSCRIPT_PROCESSOR?.toLowerCase();
  if (value === "gemini" || value === "mock") return value;
  if (value) throw new Error("TRANSCRIPT_PROCESSOR must be either gemini or mock");
  return process.env.GEMINI_API_KEY ? "gemini" : "mock";
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function processWithGemini(transcript: string): Promise<StructuredReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY must be set when TRANSCRIPT_PROCESSOR=gemini");

  const attempts = positiveInteger(process.env.GEMINI_MAX_ATTEMPTS, 2);
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: positiveInteger(process.env.GEMINI_TIMEOUT_MS, 20_000) } });
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
        contents: `Classify this 311 transcript:\n\n${transcript}`,
        config: { systemInstruction, temperature: 0.1, responseMimeType: "application/json", responseJsonSchema },
      });
      if (!response.text) throw new Error("Gemini returned an empty response");
      return parseGeminiResponse(response.text);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  const reason = lastError instanceof Error ? lastError.message : "unknown error";
  throw new Error(`Gemini transcript processing failed after ${attempts} attempt(s): ${reason}`);
}

export function parseGeminiResponse(responseText: string): StructuredReport {
  return StructuredReportSchema.parse(JSON.parse(responseText));
}

export async function processTranscript(transcript: string): Promise<StructuredReport> {
  return configuredMode() === "mock" ? processTranscriptMock(transcript) : processWithGemini(transcript);
}
