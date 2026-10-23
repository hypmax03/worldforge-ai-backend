import type { EventCategory } from "../models/Event.js";

export interface ConsistencyDraft {
  year: number;
  title: string;
  category: EventCategory;
  characterIds: readonly string[];
}

export interface ConsistencyEvent {
  year: number;
  title: string;
  category: EventCategory;
  characterIds: readonly string[];
}

export function checkEventConsistency(
  draft: ConsistencyDraft,
  events: readonly ConsistencyEvent[]
): { ok: boolean; reason?: string } {
  if (
    events.some(
      (event) =>
        event.year === draft.year &&
        event.title.toLowerCase() === draft.title.toLowerCase()
    )
  ) {
    return { ok: false, reason: "duplicate_title" };
  }

  for (const characterId of draft.characterIds) {
    const characterEvents = events.filter((event) =>
      event.characterIds.includes(characterId)
    );

    if (
      draft.category !== "death" &&
      draft.category !== "succession" &&
      characterEvents.some(
        (event) => event.category === "death" && event.year < draft.year
      )
    ) {
      return { ok: false, reason: "character_already_dead" };
    }

    if (
      characterEvents.some(
        (event) => event.category === "birth" && draft.year < event.year
      )
    ) {
      return { ok: false, reason: "character_not_yet_born" };
    }
  }

  return { ok: true };
}
