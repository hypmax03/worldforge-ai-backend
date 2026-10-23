import type { EventCategory } from "../../models/Event.js";
import type { ConsistencyDraft, ConsistencyEvent } from "../../services/consistency.js";
import type { KingdomState } from "../types.js";

export function buildKingdomState(
  overrides: Partial<KingdomState> = {}
): KingdomState {
  return {
    id: "kingdom-1",
    name: "Test Kingdom",
    population: 100,
    food: 100,
    stability: 70,
    droughtYearsLeft: 0,
    ...overrides,
  };
}

export function buildConsistencyDraft(
  overrides: Partial<ConsistencyDraft> = {}
): ConsistencyDraft {
  return {
    year: 10,
    title: "A New Era",
    category: "other",
    characterIds: [],
    ...overrides,
  };
}

export function buildConsistencyEvent(
  overrides: Partial<ConsistencyEvent> = {}
): ConsistencyEvent {
  return {
    year: 5,
    title: "An Earlier Event",
    category: "other" satisfies EventCategory,
    characterIds: [],
    ...overrides,
  };
}
