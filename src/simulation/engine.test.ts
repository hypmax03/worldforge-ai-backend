import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine.js";
import { buildKingdomState } from "./tests/helpers.js";

describe("runSimulation", () => {
  it("returns identical results for the same seed", () => {
    const kingdoms = [
      buildKingdomState({ id: "one" }),
      buildKingdomState({ id: "two", name: "Second Kingdom" }),
    ];

    expect(runSimulation(kingdoms, 1, 20, 42)).toEqual(
      runSimulation(kingdoms, 1, 20, 42)
    );
  });

  it("caps generated events at 300 and marks the result truncated", () => {
    const kingdoms = Array.from({ length: 301 }, (_, index) =>
      buildKingdomState({
        id: `kingdom-${index}`,
        droughtYearsLeft: 1,
      })
    );

    const result = runSimulation(kingdoms, 1, 1, 10);

    expect(result.events).toHaveLength(300);
    expect(result.truncated).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])(
    "keeps population and stability within valid ranges for seed %i",
    (seed) => {
      const kingdoms = Array.from({ length: 8 }, (_, index) =>
        buildKingdomState({
          id: `kingdom-${index}`,
          population: 100 + index * 100,
          food: index * 50,
          stability: index * 13,
        })
      );
      const result = runSimulation(kingdoms, 1, 50, seed);

      expect(
        result.kingdoms.every(
          (kingdom) =>
            kingdom.population >= 0 &&
            kingdom.stability >= 0 &&
            kingdom.stability <= 100
        )
      ).toBe(true);
    }
  );
});
