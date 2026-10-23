import { describe, expect, it } from "vitest";
import { checkEventConsistency } from "./consistency.js";
import {
  buildConsistencyDraft,
  buildConsistencyEvent,
} from "../simulation/tests/helpers.js";

describe("checkEventConsistency", () => {
  it("accepts a clean draft", () => {
    expect(
      checkEventConsistency(buildConsistencyDraft(), [
        buildConsistencyEvent(),
      ])
    ).toEqual({ ok: true });
  });

  it("rejects an event for a character after their death", () => {
    const draft = buildConsistencyDraft({ characterIds: ["character-1"] });
    const death = buildConsistencyEvent({
      year: 8,
      category: "death",
      characterIds: ["character-1"],
    });

    expect(checkEventConsistency(draft, [death])).toEqual({
      ok: false,
      reason: "character_already_dead",
    });
  });

  it("rejects an event before a linked character's birth", () => {
    const draft = buildConsistencyDraft({
      year: 4,
      characterIds: ["character-1"],
    });
    const birth = buildConsistencyEvent({
      year: 5,
      category: "birth",
      characterIds: ["character-1"],
    });

    expect(checkEventConsistency(draft, [birth])).toEqual({
      ok: false,
      reason: "character_not_yet_born",
    });
  });

  it("rejects a duplicate title in the same year, ignoring case", () => {
    const draft = buildConsistencyDraft({ year: 5, title: "The Founding" });
    const existing = buildConsistencyEvent({
      year: 5,
      title: "the founding",
    });

    expect(checkEventConsistency(draft, [existing])).toEqual({
      ok: false,
      reason: "duplicate_title",
    });
  });

  it("allows succession for a character after their death", () => {
    const draft = buildConsistencyDraft({
      category: "succession",
      characterIds: ["character-1"],
    });
    const death = buildConsistencyEvent({
      year: 8,
      category: "death",
      characterIds: ["character-1"],
    });

    expect(checkEventConsistency(draft, [death])).toEqual({ ok: true });
  });
});
