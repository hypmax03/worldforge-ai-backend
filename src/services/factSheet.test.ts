import { describe, expect, it } from "vitest";
import { buildFactSheet, type FactSheetInput } from "./factSheet.js";

function makeInput(): FactSheetInput {
  return {
    world: {
      name: "Asterra",
      genre: "fantasy",
      description: "A realm of old kingdoms.",
      currentYear: 120,
    },
    kingdoms: [
      {
        _id: "k1",
        name: "Northreach",
        government: "Monarchy",
        population: 10000,
        rulerId: "c1",
        capitalCityId: "city1",
      },
      {
        _id: "k2",
        name: "Southmark",
        government: "Council",
        population: 5000,
      },
    ],
    cities: [
      {
        _id: "city1",
        name: "Frosthold",
        kingdomId: "k1",
        population: 800,
      },
    ],
    characters: [
      {
        _id: "c1",
        name: "Queen Elara",
        age: 42,
        isAlive: true,
        occupation: "Ruler",
        kingdomId: "k1",
        cityId: "city1",
        biography: "A wise monarch.",
      },
    ],
    relationships: [
      {
        fromType: "kingdom",
        fromId: "k1",
        toType: "kingdom",
        toId: "k2",
        type: "allied_with",
      },
      {
        fromType: "character",
        fromId: "c1",
        toType: "kingdom",
        toId: "k2",
        type: "serves",
      },
      {
        fromType: "kingdom",
        fromId: "k2",
        toType: "kingdom",
        toId: "k1",
        type: "at_war_with",
      },
    ],
    events: [
      {
        _id: "e1",
        name: "Treaty signed",
        year: 100,
        title: "Treaty signed",
        description: "The kingdoms made peace.",
        category: "treaty",
      },
      {
        _id: "e2",
        name: "A new star",
        year: 120,
        title: "A new star",
        description: "A star appears.",
        category: "discovery",
      },
    ],
  };
}

describe("buildFactSheet", () => {
  it("keeps the result within maxChars and reports omitted facts", () => {
    const output = buildFactSheet(makeInput(), { maxChars: 900 });

    expect(output.length).toBeLessThanOrEqual(900);
    expect(output).toContain("World");
    expect(output).toContain("more omitted");
  });

  it("keeps very small character budgets bounded and includes the omission marker", () => {
    const output = buildFactSheet(makeInput(), { maxChars: 80 });

    expect(output.length).toBeLessThanOrEqual(80);
    expect(output).toContain("more omitted");
  });

  it("includes focused entities and their direct relations before unrelated facts", () => {
    const input = makeInput();
    input.kingdoms.push(
      ...Array.from({ length: 15 }, (_, index) => ({
        _id: `large-${index}`,
        name: `Distant Kingdom ${index}`,
        government: "Republic",
        population: 1000,
      }))
    );

    const output = buildFactSheet(input, {
      focus: "Please expand Queen Elara's story",
      maxChars: 1400,
    });

    expect(output).toContain("Queen Elara");
    expect(output).toContain("Northreach");
    expect(output).toContain("Frosthold");
    expect(output).not.toContain("Distant Kingdom 14");
  });

  it("renders facts deterministically regardless of input ordering", () => {
    const input = makeInput();
    const reordered: FactSheetInput = {
      ...input,
      kingdoms: [...input.kingdoms].reverse(),
      cities: [...input.cities].reverse(),
      characters: [...input.characters].reverse(),
      relationships: [...input.relationships].reverse(),
      events: [...input.events].reverse(),
    };

    expect(buildFactSheet(input)).toBe(buildFactSheet(reordered));
  });

  it("includes the required kingdom and character relationship facts", () => {
    const output = buildFactSheet(makeInput());

    expect(output).toContain('"government":"Monarchy"');
    expect(output).toContain('"population":10000');
    expect(output).toContain('"ruler":"Queen Elara"');
    expect(output).toContain('"capital":"Frosthold"');
    expect(output).toContain('"allies":["Southmark"]');
    expect(output).toContain('"enemies":["Southmark"]');
    expect(output).toContain('"wars":["Southmark"]');
    expect(output).toContain('"relationships":["serves: Southmark"]');
    expect(output).toContain('"year":100');
    expect(output).toContain('"year":120');
  });

  it("prioritizes the newest timeline events when the sheet is constrained", () => {
    const input = makeInput();
    input.events = Array.from({ length: 30 }, (_, index) => ({
      _id: `event-${index}`,
      name: `Historical event ${index}`,
      title: `Historical event ${index}`,
      year: index,
      category: "other",
    }));

    const output = buildFactSheet(input, { maxChars: 1500 });

    expect(output).toContain("Historical event 29");
    expect(output).not.toContain("Historical event 0");
    expect(output).toContain("more omitted");
  });
});
