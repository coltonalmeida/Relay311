import { describe, expect, it } from "vitest";
import { groupTranscriptTurns } from "./transcript-messages";

describe("groupTranscriptTurns", () => {
  it("combines consecutive fragments from the same speaker", () => {
    expect(
      groupTranscriptTurns([
        { role: "assistant", text: "Thanks for calling." },
        { role: "assistant", text: "How can I help?" },
        { role: "user", text: "There is a pothole." },
      ]),
    ).toEqual([
      { role: "assistant", text: "Thanks for calling. How can I help?", partial: undefined },
      { role: "user", text: "There is a pothole." },
    ]);
  });

  it("keeps a live partial fragment in the same speaker turn", () => {
    expect(
      groupTranscriptTurns([
        { role: "assistant", text: "Let me check that." },
        { role: "assistant", text: "One moment", partial: true },
      ]),
    ).toEqual([
      {
        role: "assistant",
        text: "Let me check that. One moment",
        partial: true,
      },
    ]);
  });
});
