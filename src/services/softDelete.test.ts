import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  worldFindOneAndUpdate: vi.fn(),
  worldFindOne: vi.fn(),
  worldExists: vi.fn(),
  worldUpdateOne: vi.fn(),
  kingdomFindOneAndUpdate: vi.fn(),
  kingdomFindOne: vi.fn(),
  kingdomFindById: vi.fn(),
  kingdomExists: vi.fn(),
  kingdomUpdateMany: vi.fn(),
  kingdomUpdateOne: vi.fn(),
  cityFindOneAndUpdate: vi.fn(),
  cityFindOne: vi.fn(),
  cityFindById: vi.fn(),
  cityUpdateMany: vi.fn(),
  cityUpdateOne: vi.fn(),
  characterFindOneAndUpdate: vi.fn(),
  characterFindOne: vi.fn(),
  characterFindById: vi.fn(),
  characterExists: vi.fn(),
  characterUpdateMany: vi.fn(),
  characterUpdateOne: vi.fn(),
  eventFindOne: vi.fn(),
  eventFindById: vi.fn(),
  eventUpdateMany: vi.fn(),
  eventUpdateOne: vi.fn(),
  relationshipFind: vi.fn(),
  relationshipUpdateMany: vi.fn(),
  relationshipUpdateOne: vi.fn(),
}));

function query(value: unknown) {
  return {
    select() { return this; },
    lean: vi.fn().mockResolvedValue(value),
  };
}

vi.mock("../models/World.js", () => ({
  World: {
    findOneAndUpdate: mocks.worldFindOneAndUpdate,
    findOne: mocks.worldFindOne,
    exists: mocks.worldExists,
    updateOne: mocks.worldUpdateOne,
  },
}));
vi.mock("../models/Kingdom.js", () => ({
  Kingdom: {
    findOneAndUpdate: mocks.kingdomFindOneAndUpdate,
    findOne: mocks.kingdomFindOne,
    findById: mocks.kingdomFindById,
    exists: mocks.kingdomExists,
    updateMany: mocks.kingdomUpdateMany,
    updateOne: mocks.kingdomUpdateOne,
  },
}));
vi.mock("../models/City.js", () => ({
  City: {
    findOneAndUpdate: mocks.cityFindOneAndUpdate,
    findOne: mocks.cityFindOne,
    findById: mocks.cityFindById,
    updateMany: mocks.cityUpdateMany,
    updateOne: mocks.cityUpdateOne,
  },
}));
vi.mock("../models/Character.js", () => ({
  Character: {
    findOneAndUpdate: mocks.characterFindOneAndUpdate,
    findOne: mocks.characterFindOne,
    findById: mocks.characterFindById,
    exists: mocks.characterExists,
    updateMany: mocks.characterUpdateMany,
    updateOne: mocks.characterUpdateOne,
  },
}));
vi.mock("../models/Event.js", () => ({
  Event: {
    findOne: mocks.eventFindOne,
    findById: mocks.eventFindById,
    updateMany: mocks.eventUpdateMany,
    updateOne: mocks.eventUpdateOne,
  },
}));
vi.mock("../models/Relationship.js", () => ({
  Relationship: {
    find: mocks.relationshipFind,
    updateMany: mocks.relationshipUpdateMany,
    updateOne: mocks.relationshipUpdateOne,
  },
}));

import {
  restoreEntity,
  softDeleteKingdom,
  softDeleteWorld,
} from "./softDelete.js";

const ids = {
  owner: "64b000000000000000000001",
  world: "64b000000000000000000002",
  kingdom: "64b000000000000000000003",
};

describe("soft-delete cascades", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.kingdomUpdateMany.mockResolvedValue({});
    mocks.cityUpdateMany.mockResolvedValue({});
    mocks.characterUpdateMany.mockResolvedValue({});
    mocks.eventUpdateMany.mockResolvedValue({});
    mocks.relationshipUpdateMany.mockResolvedValue({});
    mocks.eventUpdateOne.mockResolvedValue({});
    mocks.worldUpdateOne.mockResolvedValue({});
    mocks.kingdomUpdateOne.mockResolvedValue({});
    mocks.cityUpdateOne.mockResolvedValue({});
    mocks.characterUpdateOne.mockResolvedValue({});
  });

  it("cascades world deletion with the world id as provenance", async () => {
    mocks.worldFindOneAndUpdate.mockResolvedValue({ _id: ids.world });

    await softDeleteWorld(ids.world, ids.owner);

    const cascadeUpdate = {
      $set: expect.objectContaining({
        isDeleted: true,
        deletedAt: expect.any(Date),
        deletedWith: ids.world,
      }),
    };
    expect(mocks.kingdomUpdateMany).toHaveBeenCalledWith(
      { worldId: ids.world, ownerId: ids.owner, isDeleted: false },
      cascadeUpdate
    );
    expect(mocks.cityUpdateMany).toHaveBeenCalledWith(
      { worldId: ids.world, ownerId: ids.owner, isDeleted: false },
      cascadeUpdate
    );
    expect(mocks.characterUpdateMany).toHaveBeenCalledWith(
      { worldId: ids.world, ownerId: ids.owner, isDeleted: false },
      cascadeUpdate
    );
    expect(mocks.relationshipUpdateMany).toHaveBeenCalledWith(
      { worldId: ids.world, ownerId: ids.owner, isDeleted: false },
      cascadeUpdate
    );
  });

  it("cascades only kingdom cities and relationships and records the kingdom id", async () => {
    mocks.kingdomFindOneAndUpdate.mockResolvedValue({ _id: ids.kingdom });

    await softDeleteKingdom(ids.kingdom, ids.owner);

    expect(mocks.cityUpdateMany).toHaveBeenCalledWith(
      { kingdomId: ids.kingdom, ownerId: ids.owner, isDeleted: false },
      {
        $set: expect.objectContaining({
          isDeleted: true,
          deletedWith: ids.kingdom,
          deletedAt: expect.any(Date),
        }),
      }
    );
    expect(mocks.relationshipUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: ids.owner,
        isDeleted: false,
        $or: expect.any(Array),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ deletedWith: ids.kingdom }),
      })
    );
  });
});

describe("trash restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects restoring a child until its parent is active", async () => {
    mocks.kingdomFindOne.mockReturnValue(query({ _id: ids.kingdom }));
    mocks.kingdomFindById.mockReturnValue(query({ worldId: ids.world }));
    mocks.worldExists.mockResolvedValue(null);

    await expect(restoreEntity("kingdoms", ids.kingdom, ids.owner)).resolves.toEqual({
      status: 409,
    });
    expect(mocks.kingdomUpdateOne).not.toHaveBeenCalled();
  });

  it("restores only directly deleted items", async () => {
    mocks.kingdomFindOne.mockReturnValue(query(null));

    await expect(restoreEntity("kingdoms", ids.kingdom, ids.owner)).resolves.toEqual({
      status: 404,
    });
    expect(mocks.kingdomUpdateOne).not.toHaveBeenCalled();
  });
});
