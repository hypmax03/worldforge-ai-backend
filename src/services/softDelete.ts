import type { Types } from "mongoose";
import { Character } from "../models/Character.js";
import { City } from "../models/City.js";
import { Event } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import { Relationship } from "../models/Relationship.js";
import { World } from "../models/World.js";

export type TrashType = "worlds" | "kingdoms" | "cities" | "characters" | "events";

const deletionFields = (deletedAt: Date, deletedWith: Types.ObjectId | null) => ({
  isDeleted: true,
  deletedAt,
  deletedWith,
});

export async function softDeleteWorld(id: string, ownerId: string) {
  const deletedAt = new Date();
  const world = await World.findOneAndUpdate(
    { _id: id, ownerId, isDeleted: false },
    { $set: deletionFields(deletedAt, null) },
    { new: true }
  );
  if (!world) return null;

  const cascade = deletionFields(deletedAt, world._id);
  await Promise.all([
    Kingdom.updateMany({ worldId: world._id, ownerId, isDeleted: false }, { $set: cascade }),
    City.updateMany({ worldId: world._id, ownerId, isDeleted: false }, { $set: cascade }),
    Character.updateMany({ worldId: world._id, ownerId, isDeleted: false }, { $set: cascade }),
    Event.updateMany({ worldId: world._id, ownerId, isDeleted: false }, { $set: cascade }),
    Relationship.updateMany({ worldId: world._id, ownerId, isDeleted: false }, { $set: cascade }),
  ]);
  return world;
}

export async function softDeleteKingdom(id: string, ownerId: string) {
  const deletedAt = new Date();
  const kingdom = await Kingdom.findOneAndUpdate(
    { _id: id, ownerId, isDeleted: false },
    { $set: deletionFields(deletedAt, null) },
    { new: true }
  );
  if (!kingdom) return null;
  await Promise.all([
    City.updateMany(
      { kingdomId: kingdom._id, ownerId, isDeleted: false },
      { $set: deletionFields(deletedAt, kingdom._id) }
    ),
    Relationship.updateMany(
      {
        ownerId,
        isDeleted: false,
        $or: [
          { fromType: "kingdom", fromId: kingdom._id },
          { toType: "kingdom", toId: kingdom._id },
        ],
      },
      { $set: deletionFields(deletedAt, kingdom._id) }
    ),
  ]);
  return kingdom;
}

export async function softDeleteCharacter(id: string, ownerId: string) {
  const deletedAt = new Date();
  const character = await Character.findOneAndUpdate(
    { _id: id, ownerId, isDeleted: false },
    { $set: deletionFields(deletedAt, null) },
    { new: true }
  );
  if (!character) return null;
  await Promise.all([
    Relationship.updateMany(
      {
        ownerId,
        isDeleted: false,
        $or: [
          { fromType: "character", fromId: character._id },
          { toType: "character", toId: character._id },
        ],
      },
      { $set: deletionFields(deletedAt, character._id) }
    ),
    Kingdom.updateMany(
      { ownerId, rulerId: character._id, isDeleted: false },
      { $set: { rulerId: null } }
    ),
  ]);
  return character;
}

export async function softDeleteCity(id: string, ownerId: string) {
  const city = await City.findOneAndUpdate(
    { _id: id, ownerId, isDeleted: false },
    { $set: deletionFields(new Date(), null) },
    { new: true }
  );
  if (!city) return null;
  await Kingdom.updateMany(
    { ownerId, capitalCityId: city._id, isDeleted: false },
    { $set: { capitalCityId: null } }
  );
  return city;
}

async function otherRelationshipEndpointIsActive(
  relationship: { fromType: string; fromId: Types.ObjectId; toType: string; toId: Types.ObjectId },
  restoredType: "kingdom" | "character",
  restoredId: Types.ObjectId,
  ownerId: string
) {
  const otherType = relationship.fromType === restoredType && relationship.fromId.equals(restoredId)
    ? relationship.toType
    : relationship.fromType;
  const otherId = relationship.fromType === restoredType && relationship.fromId.equals(restoredId)
    ? relationship.toId
    : relationship.fromId;
  if (otherType === "kingdom") {
    return Boolean(await Kingdom.exists({ _id: otherId, ownerId, isDeleted: false }));
  }
  if (otherType === "character") {
    return Boolean(await Character.exists({ _id: otherId, ownerId, isDeleted: false }));
  }
  return false;
}

async function findDirectlyDeleted(type: TrashType, id: string, ownerId: string) {
  const filter = { _id: id, ownerId, isDeleted: true, deletedWith: null };
  switch (type) {
    case "worlds": return World.findOne(filter).select("_id").lean();
    case "kingdoms": return Kingdom.findOne(filter).select("_id").lean();
    case "cities": return City.findOne(filter).select("_id").lean();
    case "characters": return Character.findOne(filter).select("_id").lean();
    case "events": return Event.findOne(filter).select("_id").lean();
  }
}

async function hasRestorableParent(type: TrashType, id: string, ownerId: string) {
  if (type === "worlds") return true;
  if (type === "cities") {
    const city = await City.findById(id).select("kingdomId").lean();
    return Boolean(city && await Kingdom.exists({
      _id: city.kingdomId,
      ownerId,
      isDeleted: false,
    }));
  }
  if (type === "kingdoms") {
    const entity = await Kingdom.findById(id).select("worldId").lean();
    return Boolean(entity && await World.exists({
      _id: entity.worldId,
      ownerId,
      isDeleted: false,
    }));
  }
  if (type === "characters") {
    const entity = await Character.findById(id).select("worldId").lean();
    return Boolean(entity && await World.exists({
      _id: entity.worldId,
      ownerId,
      isDeleted: false,
    }));
  }
  const entity = await Event.findById(id).select("worldId").lean();
  return Boolean(entity && await World.exists({
    _id: entity.worldId,
    ownerId,
    isDeleted: false,
  }));
}

const restoredFields = { isDeleted: false, deletedAt: null, deletedWith: null };

async function restoreDirectlyDeleted(type: TrashType, id: string, ownerId: string) {
  const filter = { _id: id, ownerId, isDeleted: true, deletedWith: null };
  switch (type) {
    case "worlds": return World.updateOne(filter, { $set: restoredFields });
    case "kingdoms": return Kingdom.updateOne(filter, { $set: restoredFields });
    case "cities": return City.updateOne(filter, { $set: restoredFields });
    case "characters": return Character.updateOne(filter, { $set: restoredFields });
    case "events": return Event.updateOne(filter, { $set: restoredFields });
  }
}

export async function restoreEntity(type: TrashType, id: string, ownerId: string) {
  const entity = await findDirectlyDeleted(type, id, ownerId);
  if (!entity) return { status: 404 as const };
  if (!(await hasRestorableParent(type, id, ownerId))) {
    return { status: 409 as const };
  }
  await restoreDirectlyDeleted(type, id, ownerId);

  if (type === "worlds") {
    await Promise.all([
      Kingdom.updateMany({ deletedWith: entity._id, ownerId, isDeleted: true }, { $set: restoredFields }),
      City.updateMany({ deletedWith: entity._id, ownerId, isDeleted: true }, { $set: restoredFields }),
      Character.updateMany({ deletedWith: entity._id, ownerId, isDeleted: true }, { $set: restoredFields }),
      Event.updateMany({ deletedWith: entity._id, ownerId, isDeleted: true }, { $set: restoredFields }),
      Relationship.updateMany({ deletedWith: entity._id, ownerId, isDeleted: true }, { $set: restoredFields }),
    ]);
  } else if (type === "kingdoms") {
    await City.updateMany(
      { deletedWith: entity._id, ownerId, isDeleted: true },
      { $set: restoredFields }
    );
    await restoreCascadeRelationships(entity._id, ownerId, "kingdom");
  } else if (type === "characters") {
    await restoreCascadeRelationships(entity._id, ownerId, "character");
  }
  return { status: 200 as const };
}

async function restoreCascadeRelationships(
  id: Types.ObjectId,
  ownerId: string,
  type: "kingdom" | "character"
) {
  const relationships = await Relationship.find({
    deletedWith: id,
    ownerId,
    isDeleted: true,
  });
  const eligibleIds: Types.ObjectId[] = [];
  for (const relationship of relationships) {
    if (await otherRelationshipEndpointIsActive(relationship, type, id, ownerId)) {
      eligibleIds.push(relationship._id);
    }
  }
  if (eligibleIds.length) {
    await Relationship.updateMany(
      { _id: { $in: eligibleIds } },
      { $set: { isDeleted: false, deletedAt: null, deletedWith: null } }
    );
  }
}
