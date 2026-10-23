import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findWorld: vi.fn(),
  findKingdoms: vi.fn(),
  findCities: vi.fn(),
  bulkWriteKingdoms: vi.fn(),
  bulkWriteCities: vi.fn(),
}));

vi.mock("../models/World.js", () => ({
  World: { findOne: mocks.findWorld },
}));
vi.mock("../models/Kingdom.js", () => ({
  Kingdom: {
    find: mocks.findKingdoms,
    bulkWrite: mocks.bulkWriteKingdoms,
  },
}));
vi.mock("../models/City.js", () => ({
  City: {
    find: mocks.findCities,
    bulkWrite: mocks.bulkWriteCities,
  },
}));

import { getWorldMap, updateWorldMap } from "./worldMapController.js";

const ids = {
  user: "64b000000000000000000001",
  world: "64b000000000000000000002",
  kingdom: "64b000000000000000000003",
  city: "64b000000000000000000004",
};

function makeResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function makeRequest(body: object = {}) {
  return {
    params: { worldId: ids.world },
    body,
    user: { id: ids.user },
  } as unknown as Request;
}

function selectResult(result: unknown[]) {
  return { select: vi.fn().mockResolvedValue(result) };
}

describe("world map endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findWorld.mockResolvedValue({ _id: ids.world });
    mocks.findKingdoms.mockReturnValue(selectResult([]));
    mocks.findCities.mockReturnValue(selectResult([]));
    mocks.bulkWriteKingdoms.mockResolvedValue({ matchedCount: 1 });
    mocks.bulkWriteCities.mockResolvedValue({ matchedCount: 1 });
  });

  it("returns owned active kingdoms and cities using the map response shape", async () => {
    const kingdom = {
      _id: ids.kingdom,
      name: "Eldoria",
      population: 1200,
      mapX: 100,
      mapY: null,
      rulerId: null,
    };
    const city = {
      _id: ids.city,
      name: "Aster",
      kingdomId: ids.kingdom,
      population: 300,
      mapX: null,
      mapY: 400,
    };
    mocks.findKingdoms.mockReturnValue(selectResult([kingdom]));
    mocks.findCities.mockReturnValue(selectResult([city]));
    const response = makeResponse();

    await getWorldMap(makeRequest(), response);

    expect(mocks.findWorld).toHaveBeenCalledWith({
      _id: ids.world,
      ownerId: ids.user,
      isDeleted: false,
    });
    expect(response.json).toHaveBeenCalledWith({
      kingdoms: [
        {
          id: ids.kingdom,
          name: "Eldoria",
          population: 1200,
          mapX: 100,
          mapY: null,
          rulerId: null,
        },
      ],
      cities: [
        {
          id: ids.city,
          name: "Aster",
          kingdomId: ids.kingdom,
          population: 300,
          mapX: null,
          mapY: 400,
        },
      ],
    });
  });

  it("validates all positions before applying bulk updates", async () => {
    mocks.findKingdoms.mockReturnValue(
      selectResult([{ _id: { toString: () => ids.kingdom } }])
    );
    mocks.findCities.mockReturnValue(
      selectResult([{ _id: { toString: () => ids.city } }])
    );
    const response = makeResponse();

    await updateWorldMap(
      makeRequest({
        kingdoms: [{ id: ids.kingdom, x: 1000, y: 0 }],
        cities: [{ id: ids.city, x: 12.5, y: 900 }],
      }),
      response
    );

    expect(mocks.bulkWriteKingdoms).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: {
            _id: ids.kingdom,
            worldId: ids.world,
            ownerId: ids.user,
            isDeleted: false,
          },
          update: { $set: { mapX: 1000, mapY: 0 } },
        },
      },
    ]);
    expect(mocks.bulkWriteCities).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: {
            _id: ids.city,
            worldId: ids.world,
            ownerId: ids.user,
            isDeleted: false,
          },
          update: { $set: { mapX: 12.5, mapY: 900 } },
        },
      },
    ]);
    expect(response.json).toHaveBeenCalledWith({ updated: 2 });
  });

  it("rejects invalid coordinates without applying partial updates", async () => {
    const response = makeResponse();

    await updateWorldMap(
      makeRequest({
        kingdoms: [{ id: ids.kingdom, x: 1001, y: 0 }],
        cities: [{ id: ids.city, x: 1, y: 1 }],
      }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      message: "Invalid map payload",
    });
    expect(mocks.bulkWriteKingdoms).not.toHaveBeenCalled();
    expect(mocks.bulkWriteCities).not.toHaveBeenCalled();
  });

  it('rejects entities that do not belong to the owned world with "Invalid entity"', async () => {
    const response = makeResponse();

    await updateWorldMap(
      makeRequest({
        kingdoms: [{ id: ids.kingdom, x: 10, y: 20 }],
        cities: [],
      }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "Invalid entity" });
    expect(mocks.bulkWriteKingdoms).not.toHaveBeenCalled();
  });

  it("rejects malformed entity ids as invalid entities", async () => {
    const response = makeResponse();

    await updateWorldMap(
      makeRequest({
        kingdoms: [{ id: "not-an-object-id", x: 10, y: 20 }],
        cities: [],
      }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: "Invalid entity" });
    expect(mocks.findKingdoms).not.toHaveBeenCalled();
  });
});
