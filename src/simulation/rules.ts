import type { KingdomState, RuleResult, SimEvent } from "./types.js";

function createEvent(
  state: KingdomState,
  year: number,
  title: string,
  description: string,
  category: SimEvent["category"]
): SimEvent {
  return {
    year,
    title,
    description,
    category,
    kingdomId: state.id,
  };
}

export function droughtRule(
  state: KingdomState,
  year: number,
  rng: () => number
): RuleResult {
  if (state.droughtYearsLeft === 0) {
    if (rng() >= 0.06) {
      return { state, events: [] };
    }

    const duration = Math.floor(rng() * 3) + 1;
    return {
      state: { ...state, droughtYearsLeft: duration },
      events: [
        createEvent(
          state,
          year,
          `Drought strikes ${state.name}`,
          `A drought begins and is expected to last ${duration} year(s).`,
          "disaster"
        ),
      ],
    };
  }

  const droughtYearsLeft = Math.max(0, state.droughtYearsLeft - 1);
  return {
    state: { ...state, droughtYearsLeft },
    events:
      droughtYearsLeft === 0
        ? [
            createEvent(
              state,
              year,
              `Drought ends in ${state.name}`,
              "The drought has ended.",
              "disaster"
            ),
          ]
        : [],
  };
}

export function foodRule(state: KingdomState): RuleResult {
  const production =
    state.population * 1.05 * (state.droughtYearsLeft > 0 ? 0.5 : 1);
  const consumption = state.population;
  const food = Math.min(
    Math.max(0, state.food + production - consumption),
    state.population * 3
  );
  return { state: { ...state, food }, events: [] };
}

export function populationRule(state: KingdomState): RuleResult {
  let population = state.population;
  if (state.food >= population * 0.5) {
    population = Math.round(population * 1.01);
  } else if (state.food === 0) {
    population = Math.round(population * 0.97);
  }

  return {
    state: { ...state, population: Math.max(0, population) },
    events: [],
  };
}

export function stabilityRule(state: KingdomState, year: number): RuleResult {
  const previousStability = state.stability;
  let stability = Math.min(
    100,
    Math.max(0, previousStability + (state.food === 0 ? -6 : 1))
  );
  const events: SimEvent[] = [];

  if (previousStability >= 30 && stability < 30) {
    events.push(
      createEvent(
        state,
        year,
        `Unrest spreads in ${state.name}`,
        "Shortages and hardship have sparked unrest.",
        "other"
      )
    );
  }

  if (previousStability >= 10 && stability < 10) {
    events.push(
      createEvent(
        state,
        year,
        `Civil war breaks out in ${state.name}`,
        "A civil war breaks out as the kingdom's stability collapses.",
        "war"
      )
    );
    stability = 25;
  }

  return { state: { ...state, stability }, events };
}
