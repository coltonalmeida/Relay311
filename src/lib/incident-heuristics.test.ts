import { describe, expect, it } from "vitest";
import {
  buildActivityTimeline,
  deriveTitle,
  derivePriority,
  displayId,
  findDuplicateCandidate,
  formatDuration,
  isEscalatedCall,
  maskPhone,
} from "./incident-heuristics";
import type { IncidentRecord, StructuredReport } from "./schemas";

function report(overrides: Partial<StructuredReport> = {}): StructuredReport {
  return {
    intent: "Report a municipal issue",
    category: "pothole",
    subtype: "service-request",
    summary: "A pothole was reported.",
    actionable: true,
    confidence: 0.9,
    location: { raw: "Main Street" },
    observations: {},
    ...overrides,
  };
}

function incident(overrides: Partial<IncidentRecord> = {}): IncidentRecord {
  return {
    id: "995a4bd1-d7aa-4af2-b9a2-c24f5f8a587b",
    callId: "15418788-2cc0-4c40-bf9b-5db8ecce42b8",
    status: "new",
    title: "Pothole — Main Street",
    category: "pothole",
    subtype: "service-request",
    summary: "A pothole was reported.",
    priority: "medium",
    assignee: null,
    location: { raw: "Main Street" },
    observations: {},
    confidence: 0.9,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("displayId", () => {
  it("formats a stable, uppercase short id with the given prefix", () => {
    expect(displayId("995a4bd1-d7aa-4af2-b9a2-c24f5f8a587b", "INC")).toBe("INC-995A4B");
    expect(displayId("995a4bd1-d7aa-4af2-b9a2-c24f5f8a587b", "CALL")).toBe("CALL-995A4B");
  });
});

describe("maskPhone", () => {
  it("keeps only the last 4 digits visible", () => {
    expect(maskPhone("+17162298011")).toBe("+•••••••8011");
  });

  it("returns null for a missing phone number", () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
  });
});

describe("deriveTitle", () => {
  it("combines the category label with the reported location", () => {
    expect(deriveTitle(report())).toBe("Pothole — Main Street");
  });

  it("falls back to the subtype when no location was captured", () => {
    expect(deriveTitle(report({ location: { raw: "" }, subtype: "downed-branch" }))).toBe(
      "Pothole — downed branch",
    );
  });
});

describe("derivePriority", () => {
  it("flags life-safety language as critical", () => {
    expect(derivePriority(report({ summary: "Caller reports a live wire down and a person is trapped." }))).toBe(
      "critical",
    );
  });

  it("flags flooding and blocked-access language as high", () => {
    expect(derivePriority(report({ summary: "Water main break flooding the road, lane is blocked." }))).toBe(
      "high",
    );
  });

  it("defaults noise and graffiti reports to low", () => {
    expect(derivePriority(report({ category: "noise", summary: "Loud music after hours." }))).toBe("low");
    expect(derivePriority(report({ category: "graffiti", summary: "Graffiti on a wall." }))).toBe("low");
  });

  it("defaults everything else to medium", () => {
    expect(derivePriority(report({ summary: "A routine pothole report." }))).toBe("medium");
  });
});

describe("findDuplicateCandidate", () => {
  it("matches an open incident with the same category and overlapping location", () => {
    const existing = incident({ location: { raw: "123 Main Street" } });
    const match = findDuplicateCandidate(report({ location: { raw: "Main Street" } }), [existing]);
    expect(match?.id).toBe(existing.id);
  });

  it("ignores incidents in a different category", () => {
    const existing = incident({ category: "water", location: { raw: "123 Main Street" } });
    expect(findDuplicateCandidate(report({ location: { raw: "Main Street" } }), [existing])).toBeNull();
  });

  it("ignores incidents with no location overlap", () => {
    const existing = incident({ location: { raw: "5th Avenue" } });
    expect(findDuplicateCandidate(report({ location: { raw: "Main Street" } }), [existing])).toBeNull();
  });

  it("ignores incidents older than the duplicate window", () => {
    const old = incident({
      location: { raw: "Main Street" },
      createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
    });
    expect(findDuplicateCandidate(report({ location: { raw: "Main Street" } }), [old])).toBeNull();
  });
});

describe("formatDuration", () => {
  it("renders sub-minute durations as <1m", () => {
    expect(formatDuration(30_000)).toBe("<1m");
  });

  it("renders minutes only under an hour", () => {
    expect(formatDuration(12 * 60_000)).toBe("12m");
  });

  it("renders hours and minutes over an hour", () => {
    expect(formatDuration(64 * 60_000)).toBe("1h 4m");
  });
});

describe("buildActivityTimeline", () => {
  it("includes intake and creation events in order, plus the terminal status event", () => {
    const receivedAt = "2026-09-19T15:00:00.000Z";
    const timeline = buildActivityTimeline(incident({ status: "assigned" }), receivedAt);
    expect(timeline.map((entry) => entry.label)).toEqual([
      "Report received via AI intake",
      "AI created incident, priority set to medium",
      "Incident approved and assigned",
    ]);
  });

  it("omits the intake event when there is no primary call timestamp", () => {
    const timeline = buildActivityTimeline(incident({ status: "new" }), null);
    expect(timeline.map((entry) => entry.label)).toEqual(["AI created incident, priority set to medium"]);
  });
});

describe("isEscalatedCall", () => {
  it("detects the fixed 911 hand-off phrase from the assistant", () => {
    expect(
      isEscalatedCall([
        { role: "user", text: "There's a gas leak and I smell smoke." },
        { role: "assistant", text: "This may be an emergency. Please hang up and call 911 now." },
      ]),
    ).toBe(true);
  });

  it("returns false for a normal call", () => {
    expect(
      isEscalatedCall([
        { role: "assistant", text: "What municipal issue are you reporting today?" },
        { role: "user", text: "A pothole on Main Street." },
      ]),
    ).toBe(false);
  });
});
