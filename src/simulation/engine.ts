import { createRng } from "./rng.js";
import {
  droughtRule,
  foodRule,
  populationRule,
  stabilityRule,
} from "./rules.js";
import type {
  KingdomState,
  RuleResult,
  SimEvent,
  SimulationResult,
  YearSummary,
} from "./types.js";

const MAX_YEARS_PER_RUN = 50;
const MAX_EVENTS_PER_RUN = 300;

function applyRule(
  result: RuleResult,
  rule: (state: KingdomState) => RuleResult
): RuleResult {
  const next = rule(result.state);
  return { state: next.state, events: [...result.events, ...next.events] };
}

export function stepKingdom(
  state: KingdomState,
  year: number,
  rng: () => number
): RuleResult {
  let result = droughtRule(state, year, rng);
  result = applyRule(result, foodRule);
  result = applyRule(result, populationRule);
  const stabilityResult = stabilityRule(result.state, year);
  return {
    state: stabilityResult.state,
    events: [...result.events, ...stabilityResult.events],
  };
}

export function runSimulation(
  kingdoms: readonly KingdomState[],
  startYear: number,
  years: number,
  seed: number
): SimulationResult {
  if (!Number.isInteger(years) || years < 0) {
    throw new RangeError("Simulation years must be a non-negative integer");
  }

  const yearsToRun = Math.min(years, MAX_YEARS_PER_RUN);
  const rng = createRng(seed);
  let states = kingdoms.map((kingdom) => ({ ...kingdom }));
  const events: SimEvent[] = [];
  const summary: YearSummary[] = [];
  let truncated = years > MAX_YEARS_PER_RUN;

  for (let yearOffset = 0; yearOffset < yearsToRun; yearOffset += 1) {
    const year = startYear + yearOffset;
    const yearEvents: SimEvent[] = [];
    states = states.map((state) => {
      const result = stepKingdom(state, year, rng);
      yearEvents.push(...result.events);
      return result.state;
    });

    const remainingEventCapacity = MAX_EVENTS_PER_RUN - events.length;
    const includedEvents = yearEvents.slice(0, remainingEventCapacity);
    if (includedEvents.length < yearEvents.length) truncated = true;
    events.push(...includedEvents);

    const totalPopulation = states.reduce(
      (total, state) => total + state.population,
      0
    );
    const totalStability = states.reduce(
      (total, state) => total + state.stability,
      0
    );
    summary.push({
      year,
      totalPopulation,
      avgStability: states.length > 0 ? totalStability / states.length : 0,
      eventCount: includedEvents.length,
    });
  }

  return { kingdoms: states, events, summary, truncated };
}
