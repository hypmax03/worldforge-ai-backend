import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findWorld: vi.fn(),
  findKingdoms: vi.fn(),
  findCities: vi.fn(),
  findCharacters: vi.fn(),
  findRelationships: vi.fn(),
  findEvents: vi.fn(),
}));

vi.mock("../models/World.js", () => ({
  World: { findOne: mocks.findWorld },
}));
vi.mock("../models/Kingdom.js", () => ({
  Kingdom: { find: mocks.findKingdoms },
}));
vi.mock("../models/City.js", () => ({
  City: { find: mocks.findCities },
}));
vi.mock("../models/Character.js", () => ({
  Character: { find: mocks.findCharacters },
}));
vi.mock("../models/Relationship.js", () => ({
  Relationship: { find: mocks.findRelationships },
}));
vi.mock("../models/Event.js", () => ({
  Event: { find: mocks.findEvents },
}));

import { getWorldAudit } from "./worldAuditController.js";

const worldId = "64b000000000000000000002";
const userId = "64b000000000000000000001";

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
    params: { worldId },
    user: { id: userId },
  } as unknown as Request;
}

describe("getWorldAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findWorld.mockResolvedValue({
      _id: worldId,
      currentYear: 20,
    });
    mocks.findKingdoms.mockResolvedValue([]);
    mocks.findCities.mockResolvedValue([]);
    mocks.findCharacters.mockResolvedValue([]);
    mocks.findRelationships.mockResolvedValue([]);
    mocks.findEvents.mockResolvedValue([]);
  });

  it("verifies ownership and returns issue counts with a checked timestamp", async () => {
    const response = makeResponse();

    await getWorldAudit(makeRequest(), response);

    const filter = {
      worldId,
      ownerId: userId,
      isDeleted: false,
    };
    expect(mocks.findWorld).toHaveBeenCalledWith({
      _id: worldId,
      ownerId: userId,
      isDeleted: false,
    });
    expect(mocks.findKingdoms).toHaveBeenCalledWith(filter);
    expect(mocks.findCities).toHaveBeenCalledWith(filter);
    expect(mocks.findCharacters).toHaveBeenCalledWith(filter);
    expect(mocks.findRelationships).toHaveBeenCalledWith(filter);
    expect(mocks.findEvents).toHaveBeenCalledWith(filter);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      issues: [],
      counts: { error: 0, warning: 0, info: 0 },
      checkedAt: expect.any(Date),
    });
  });

  it("does not load audit data when the world is not owned", async () => {
    mocks.findWorld.mockResolvedValue(null);
    const response = makeResponse();

    await getWorldAudit(makeRequest(), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ message: "World not found" });
    expect(mocks.findKingdoms).not.toHaveBeenCalled();
    expect(mocks.findCities).not.toHaveBeenCalled();
  });
});
