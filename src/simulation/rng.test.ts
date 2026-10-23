import { describe, expect, it } from "vitest";
import { createRng } from "./rng.js";

describe("createRng", () => {
  it("returns the same sequence for the same seed", () => {
    const first = createRng(12345);
    const second = createRng(12345);

    expect(Array.from({ length: 10 }, first)).toEqual(
      Array.from({ length: 10 }, second)
    );
  });

  it("returns different sequences for different seeds", () => {
    const first = createRng(12345);
    const second = createRng(54321);

    expect(Array.from({ length: 10 }, first)).not.toEqual(
      Array.from({ length: 10 }, second)
    );
  });

  it("keeps generated values in the range [0, 1)", () => {
    const rng = createRng(7);

    for (let index = 0; index < 1000; index += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
