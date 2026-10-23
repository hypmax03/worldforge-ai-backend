import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findWorld: vi.fn(),
  findCharacters: vi.fn(),
  findKingdoms: vi.fn(),
  findCities: vi.fn(),
  findEvents: vi.fn(),
  findRelationships: vi.fn(),
  generateStructured: vi.fn(),
}));

vi.mock("../models/World.js", () => ({
  World: { findOne: mocks.findWorld },
}));
vi.mock("../models/Character.js", () => ({
  Character: { find: mocks.findCharacters },
}));
vi.mock("../models/Kingdom.js", () => ({
  Kingdom: { find: mocks.findKingdoms },
}));
vi.mock("../models/City.js", () => ({
  City: { find: mocks.findCities },
}));
vi.mock("../models/Event.js", () => ({
  eventCategories: [
    "founding",
    "war",
    "birth",
    "death",
    "succession",
    "disaster",
    "treaty",
    "discovery",
    "other",
  ],
  Event: { find: mocks.findEvents },
}));
vi.mock("../models/Relationship.js", () => ({
  Relationship: { find: mocks.findRelationships },
}));
vi.mock("../services/aiService.js", () => ({
  generateStructured: mocks.generateStructured,
}));

import { scanWorldContradictions } from "./aiController.js";

const ids = {
  user: "64b000000000000000000001",
  world: "64b000000000000000000002",
  character: "64b000000000000000000003",
  kingdom: "64b000000000000000000004",
  city: "64b000000000000000000005",
  event: "64b000000000000000000006",
};

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function makeRequest() {
  return {
    params: { worldId: ids.world },
    user: { id: ids.user },
  } as unknown as Request;
}

function query(result: unknown[]) {
  const chain = {
    sort: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn().mockResolvedValue(result),
  };
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

describe("scanWorldContradictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findWorld.mockResolvedValue({
      _id: ids.world,
      name: "Asterra",
      genre: "fantasy",
      currentYear: 100,
    });
    mocks.findCharacters.mockReturnValue(
      query([
        {
          _id: ids.character,
          name: "Elara",
          biography: "B".repeat(450),
          age: 42,
          isAlive: true,
        },
      ])
    );
    mocks.findKingdoms.mockReturnValue(
      query([{ _id: ids.kingdom, name: "Northreach", population: 200 }])
    );
    mocks.findCities.mockReturnValue(
      query([{ _id: ids.city, name: "Frosthold", kingdomId: ids.kingdom }])
    );
    mocks.findEvents.mockReturnValue(
      query([
        {
          _id: ids.event,
          title: "The treaty",
          year: 90,
          category: "treaty",
          description: "E".repeat(450),
          characterIds: [ids.character],
        },
      ])
    );
    mocks.findRelationships.mockReturnValue(query([]));
    mocks.generateStructured.mockResolvedValue({
      issues: [
        {
          severity: "warning",
          entityType: "character",
          entityName: "elara",
          problem: "Conflicting age.",
          suggestion: "Resolve the age.",
        },
        {
          severity: "error",
          entityType: "city",
          entityName: "Unknown place",
          problem: "Not loaded.",
          suggestion: "Remove it.",
        },
      ],
    });
  });

  it("bounds loaded data, delimits truncated text, and filters unknown entity names", async () => {
    const response = makeResponse();

    await scanWorldContradictions(makeRequest(), response);

    expect(mocks.findWorld).toHaveBeenCalledWith({
      _id: ids.world,
      ownerId: ids.user,
      isDeleted: false,
    });
    expect(mocks.findCharacters.mock.results[0]?.value.limit).toHaveBeenCalledWith(100);
    expect(mocks.findKingdoms.mock.results[0]?.value.limit).toHaveBeenCalledWith(50);
    expect(mocks.findCities.mock.results[0]?.value.limit).toHaveBeenCalledWith(150);
    expect(mocks.findEvents.mock.results[0]?.value.limit).toHaveBeenCalledWith(200);
    const prompt = mocks.generateStructured.mock.calls[0]?.[0].prompt as string;
    expect(prompt).toContain("B".repeat(400));
    expect(prompt).not.toContain("B".repeat(401));
    expect(prompt).toContain("E".repeat(400));
    expect(prompt).not.toContain("E".repeat(401));
    expect(prompt).toContain("<free_text_sources>");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      issues: [
        {
          severity: "warning",
          entityType: "character",
          entityName: "elara",
          problem: "Conflicting age.",
          suggestion: "Resolve the age.",
        },
      ],
      scannedAt: expect.any(Date),
    });
  });

  it("provides a schema capped at 15 findings", async () => {
    await scanWorldContradictions(makeRequest(), makeResponse());
    const schema = mocks.generateStructured.mock.calls[0]?.[0]
      .schema as { safeParse: (value: unknown) => { success: boolean } };
    const tooManyIssues = {
      issues: Array.from({ length: 16 }, () => ({
        severity: "warning",
        entityType: "world",
        entityName: "Asterra",
        problem: "Problem",
        suggestion: "Suggestion",
      })),
    };

    expect(schema.safeParse(tooManyIssues).success).toBe(false);
  });
});
