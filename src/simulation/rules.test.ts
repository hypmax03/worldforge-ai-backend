import { describe, expect, it } from "vitest";
import {
  droughtRule,
  foodRule,
  populationRule,
  stabilityRule,
} from "./rules.js";
import { buildKingdomState } from "./tests/helpers.js";

describe("foodRule", () => {
  it("adds a food surplus when production exceeds consumption", () => {
    const result = foodRule(buildKingdomState({ food: 20 }));

    expect(result.state.food).toBeCloseTo(25);
  });

  it("does not let food fall below zero during a shortage", () => {
    const result = foodRule(
      buildKingdomState({ food: 0, droughtYearsLeft: 1 })
    );

    expect(result.state.food).toBe(0);
  });

  it("halves production during a drought", () => {
    const result = foodRule(
      buildKingdomState({ food: 200, droughtYearsLeft: 1 })
    );

    expect(result.state.food).toBeCloseTo(152.5);
  });

  it("caps stored food at three times the population", () => {
    const result = foodRule(buildKingdomState({ food: 1000 }));

    expect(result.state.food).toBe(300);
  });
});

describe("populationRule", () => {
  it("grows population by one percent when food is sufficient", () => {
    const result = populationRule(
      buildKingdomState({ population: 100, food: 50 })
    );

    expect(result.state.population).toBe(101);
  });

  it("shrinks population by three percent when food is zero", () => {
    const result = populationRule(
      buildKingdomState({ population: 100, food: 0 })
    );

    expect(result.state.population).toBe(97);
  });

  it("never returns a negative population", () => {
    const result = populationRule(
      buildKingdomState({ population: 0, food: 0 })
    );

    expect(result.state.population).toBe(0);
  });
});

describe("stabilityRule", () => {
  it("lowers stability when food is unavailable", () => {
    const result = stabilityRule(
      buildKingdomState({ stability: 70, food: 0 }),
      1
    );

    expect(result.state.stability).toBe(64);
  });

  it("raises stability when food is available", () => {
    const result = stabilityRule(
      buildKingdomState({ stability: 70, food: 1 }),
      1
    );

    expect(result.state.stability).toBe(71);
  });

  it("clamps stability to the range 0 through 100", () => {
    const atZero = stabilityRule(
      buildKingdomState({ stability: 0, food: 0 }),
      1
    );
    const atHundred = stabilityRule(
      buildKingdomState({ stability: 100, food: 1 }),
      1
    );

    expect(atZero.state.stability).toBe(0);
    expect(atHundred.state.stability).toBe(100);
  });

  it("emits unrest once when stability crosses below 30", () => {
    const first = stabilityRule(
      buildKingdomState({ stability: 32, food: 0 }),
      1
    );
    const next = stabilityRule(first.state, 2);

    expect(first.events.map((event) => event.title)).toEqual([
      "Unrest spreads in Test Kingdom",
    ]);
    expect(next.events).toEqual([]);
  });

  it("emits civil war and resets stability when crossing below 10", () => {
    const result = stabilityRule(
      buildKingdomState({ stability: 14, food: 0 }),
      1
    );

    expect(result.events.map((event) => event.title)).toEqual([
      "Civil war breaks out in Test Kingdom",
    ]);
    expect(result.events[0]?.category).toBe("war");
    expect(result.state.stability).toBe(25);
  });
});

describe("droughtRule", () => {
  it("starts a drought when the random value is below the threshold", () => {
    const randomValues = [0, 0.5];
    const result = droughtRule(
      buildKingdomState({ droughtYearsLeft: 0 }),
      12,
      () => randomValues.shift() ?? 0
    );

    expect(result.state.droughtYearsLeft).toBe(2);
    expect(result.events[0]?.title).toBe("Drought strikes Test Kingdom");
  });

  it("counts a drought down and emits an event when it ends", () => {
    const state = buildKingdomState({ droughtYearsLeft: 2 });
    const firstYear = droughtRule(state, 12, () => 1);
    const finalYear = droughtRule(firstYear.state, 13, () => 1);

    expect(firstYear.state.droughtYearsLeft).toBe(1);
    expect(firstYear.events).toEqual([]);
    expect(finalYear.state.droughtYearsLeft).toBe(0);
    expect(finalYear.events[0]?.title).toBe("Drought ends in Test Kingdom");
  });
});
