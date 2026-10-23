import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findKingdom: vi.fn(),
  updateKingdom: vi.fn(),
  updateKingdoms: vi.fn(),
  findCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  findCity: vi.fn(),
  updateCity: vi.fn(),
  findCities: vi.fn(),
  createEvent: vi.fn(),
  findWorld: vi.fn(),
  updateRelationships: vi.fn(),
}));

vi.mock("../models/Kingdom.js", () => ({
  Kingdom: {
    findOne: mocks.findKingdom,
    findOneAndUpdate: mocks.updateKingdom,
    updateMany: mocks.updateKingdoms,
  },
}));
vi.mock("../models/Character.js", () => ({
  Character: {
    findOne: mocks.findCharacter,
    findOneAndUpdate: mocks.updateCharacter,
  },
}));
vi.mock("../models/City.js", () => ({
  City: {
    findOne: mocks.findCity,
    findOneAndUpdate: mocks.updateCity,
    find: mocks.findCities,
  },
}));
vi.mock("../models/Event.js", () => ({
  Event: { create: mocks.createEvent },
}));
vi.mock("../models/World.js", () => ({
  World: { findOne: mocks.findWorld },
}));
vi.mock("../models/Relationship.js", () => ({
  Relationship: { updateMany: mocks.updateRelationships },
}));

import { updateKingdom } from "./kingdomController.js";
import { deleteCity, getWorldCities } from "./cityController.js";
import { deleteCharacter } from "./characterController.js";

const ids = {
  user: "64b000000000000000000001",
  world: "64b000000000000000000002",
  kingdom: "64b000000000000000000003",
  character: "64b000000000000000000004",
  city: "64b000000000000000000005",
};

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function makeRequest(params: Record<string, string>, body: object = {}) {
  return {
    params,
    body,
    user: { id: ids.user },
  } as unknown as Request;
}

describe("kingdom ruler and capital updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findKingdom.mockResolvedValue({
      _id: ids.kingdom,
      worldId: ids.world,
      rulerId: null,
      name: "Eldoria",
    });
    mocks.updateKingdom.mockResolvedValue({ _id: ids.kingdom, name: "Eldoria" });
    mocks.findCharacter.mockResolvedValue({
      _id: ids.character,
      name: "Aria",
    });
    mocks.findCity.mockResolvedValue({ _id: ids.city });
    mocks.findWorld.mockResolvedValue({
      _id: ids.world,
      currentYear: 42,
    });
    mocks.createEvent.mockResolvedValue({});
  });

  it("assigns a same-world ruler and records an optional succession event", async () => {
    const response = makeResponse();

    await updateKingdom(
      makeRequest(
        { id: ids.kingdom },
        { rulerId: ids.character, recordSuccession: true }
      ),
      response
    );

    expect(mocks.findCharacter).toHaveBeenCalledWith({
      _id: ids.character,
      ownerId: ids.user,
      worldId: ids.world,
      isDeleted: false,
    });
    expect(mocks.updateKingdom).toHaveBeenCalledWith(
      { _id: ids.kingdom, ownerId: ids.user, isDeleted: false },
      { $set: { rulerId: ids.character } },
      { new: true, runValidators: true }
    );
    expect(mocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        worldId: ids.world,
        ownerId: ids.user,
        year: 42,
        title: "Aria becomes ruler of Eldoria",
        category: "succession",
        source: "manual",
        characterIds: [ids.character],
        kingdomIds: [ids.kingdom],
      })
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("rejects a ruler that is not an active character in the kingdom's world", async () => {
    mocks.findCharacter.mockResolvedValue(null);
    const response = makeResponse();

    await updateKingdom(
      makeRequest({ id: ids.kingdom }, { rulerId: ids.character }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "Invalid ruler" });
    expect(mocks.updateKingdom).not.toHaveBeenCalled();
  });

  it("rejects a capital that does not belong to this kingdom", async () => {
    mocks.findCity.mockResolvedValue(null);
    const response = makeResponse();

    await updateKingdom(
      makeRequest({ id: ids.kingdom }, { capitalCityId: ids.city }),
      response
    );

    expect(mocks.findCity).toHaveBeenCalledWith({
      _id: ids.city,
      ownerId: ids.user,
      kingdomId: ids.kingdom,
      isDeleted: false,
    });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "Invalid capital" });
    expect(mocks.updateKingdom).not.toHaveBeenCalled();
  });

  it("allows either reference to be cleared with null", async () => {
    const response = makeResponse();

    await updateKingdom(
      makeRequest(
        { id: ids.kingdom },
        { rulerId: null, capitalCityId: null }
      ),
      response
    );

    expect(mocks.updateKingdom).toHaveBeenCalledWith(
      { _id: ids.kingdom, ownerId: ids.user, isDeleted: false },
      { $set: { rulerId: null, capitalCityId: null } },
      { new: true, runValidators: true }
    );
    expect(mocks.createEvent).not.toHaveBeenCalled();
  });

  it("clears a kingdom's ruler when the character is deleted", async () => {
    mocks.updateCharacter.mockResolvedValue({ _id: ids.character });
    const response = makeResponse();

    await deleteCharacter(makeRequest({ id: ids.character }), response);

    expect(mocks.updateKingdoms).toHaveBeenCalledWith(
      { ownerId: ids.user, rulerId: ids.character, isDeleted: false },
      { $set: { rulerId: null } }
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("clears a kingdom's capital when the city is deleted", async () => {
    mocks.updateCity.mockResolvedValue({ _id: ids.city });
    const response = makeResponse();

    await deleteCity(makeRequest({ id: ids.city }), response);

    expect(mocks.updateKingdoms).toHaveBeenCalledWith(
      { ownerId: ids.user, capitalCityId: ids.city, isDeleted: false },
      { $set: { capitalCityId: null } }
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });
});

describe("world city listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findWorld.mockResolvedValue({ _id: ids.world });
    mocks.findCities.mockResolvedValue([{ _id: ids.city }]);
  });

  it("checks world ownership and returns only active cities belonging to that owner", async () => {
    const response = makeResponse();

    await getWorldCities(
      makeRequest({ worldId: ids.world }),
      response
    );

    expect(mocks.findWorld).toHaveBeenCalledWith({
      _id: ids.world,
      ownerId: ids.user,
      isDeleted: false,
    });
    expect(mocks.findCities).toHaveBeenCalledWith({
      worldId: ids.world,
      ownerId: ids.user,
      isDeleted: false,
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });
});
