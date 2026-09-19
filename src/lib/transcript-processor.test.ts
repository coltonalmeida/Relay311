import { describe, expect, it } from "vitest";
import { StructuredReportSchema } from "./schemas";
import { parseGeminiResponse, processTranscriptMock } from "./transcript-processor";

describe("processTranscriptMock", () => {
  it("classifies a pothole report as actionable and conforms to the shared schema", () => {
    const report = processTranscriptMock("There is a large pothole at 5 Main Street");
    expect(report.actionable).toBe(true);
    expect(report.category).toBe("pothole");
    expect(StructuredReportSchema.parse(report)).toEqual(report);
  });

  it("classifies an information request as non-actionable", () => {
    const report = processTranscriptMock("What time does city hall open?");
    expect(report.actionable).toBe(false);
    expect(report.category).toBe("other");
    expect(StructuredReportSchema.parse(report)).toEqual(report);
  });

  it("classifies water and streetlight reports for offline development", () => {
    expect(processTranscriptMock("A water main leak is flooding the road").category).toBe("water");
    expect(processTranscriptMock("The streetlight is broken and there is an outage").category).toBe("streetlight");
  });

  it("does not classify a parking information question as actionable", () => {
    expect(processTranscriptMock("What are the parking hours on Sunday?").actionable).toBe(false);
  });
});

describe("parseGeminiResponse", () => {
  it("validates a structured Gemini response", () => {
    const report = parseGeminiResponse(
      JSON.stringify({
        intent: "Report pothole",
        category: "pothole",
        subtype: "pothole",
        summary: "A pothole was reported on Main Street.",
        actionable: true,
        confidence: 0.95,
        location: { raw: "Main Street" },
        observations: { laneBlocked: false },
      }),
    );
    expect(report.location.raw).toBe("Main Street");
  });

  it("rejects a semantically invalid Gemini response", () => {
    expect(() => parseGeminiResponse(JSON.stringify({ actionable: "yes" }))).toThrow();
  });

  it("rejects a category outside the fixed enum", () => {
    expect(() =>
      parseGeminiResponse(
        JSON.stringify({
          intent: "Report issue",
          category: "roads",
          subtype: "pothole",
          summary: "A pothole was reported.",
          actionable: true,
          confidence: 0.9,
          location: { raw: "" },
          observations: {},
        }),
      ),
    ).toThrow();
  });
});
