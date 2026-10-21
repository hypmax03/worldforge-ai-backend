import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Character } from "../models/Character.js";
import { Kingdom } from "../models/Kingdom.js";
import {
  Relationship,
  type RelationshipEntityType,
  type RelationshipType,
} from "../models/Relationship.js";
import { World } from "../models/World.js";

const relationshipTypes = [
  "parent",
  "spouse",
  "sibling",
  "friend",
  "enemy",
  "ally",
  "rival",
  "mentor",
  "serves",
  "at_war_with",
  "allied_with",
  "trade_partner",
] as const satisfies readonly RelationshipType[];

const characterRelationships = [
  "parent",
  "spouse",
  "sibling",
  "friend",
  "enemy",
  "rival",
  "mentor",
  "serves",
] as const;

const kingdomRelationships = [
  "at_war_with",
  "allied_with",
  "trade_partner",
] as const;

const characterKingdomRelationships = ["serves", "ally", "enemy"] as const;

async function verifyWorldOwnership(worldId: string, userId: string) {
  return World.findOne({ _id: worldId, ownerId: userId, isDeleted: false });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntityType(value: unknown): value is RelationshipEntityType {
  return value === "character" || value === "kingdom";
}

function isRelationshipType(value: unknown): value is RelationshipType {
  return typeof value === "string" && relationshipTypes.includes(value as RelationshipType);
}

function isAllowedPair(
  fromType: RelationshipEntityType,
  toType: RelationshipEntityType,
  type: RelationshipType
): boolean {
  if (fromType === "character" && toType === "character") {
    return characterRelationships.includes(
      type as (typeof characterRelationships)[number]
    );
  }
  if (fromType === "kingdom" && toType === "kingdom") {
    return kingdomRelationships.includes(
      type as (typeof kingdomRelationships)[number]
    );
  }
  return (
    fromType === "character" &&
    toType === "kingdom" &&
    characterKingdomRelationships.includes(
      type as (typeof characterKingdomRelationships)[number]
    )
  );
}

async function entityExists(
  entityType: RelationshipEntityType,
  entityId: string,
  worldId: string,
  ownerId: string
): Promise<boolean> {
  const filter = {
    _id: entityId,
    worldId,
    ownerId,
    isDeleted: false,
  };

  if (entityType === "character") {
    return Boolean(await Character.exists(filter));
  }
  return Boolean(await Kingdom.exists(filter));
}

export async function createRelationship(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.worldId || typeof req.params.worldId !== "string") {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await verifyWorldOwnership(req.params.worldId, req.user.id);
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    if (!isRecord(req.body)) {
      return res.status(400).json({ message: "Invalid relationship" });
    }

    const { fromType, fromId, toType, toId, type, notes } = req.body;
    if (
      !isEntityType(fromType) ||
      !isEntityType(toType) ||
      typeof fromId !== "string" ||
      typeof toId !== "string" ||
      !isRelationshipType(type) ||
      (notes !== undefined &&
        (typeof notes !== "string" || notes.length > 300))
    ) {
      return res.status(400).json({ message: "Invalid relationship" });
    }

    if (
      !mongoose.isObjectIdOrHexString(fromId) ||
      !mongoose.isObjectIdOrHexString(toId) ||
      fromId.toLowerCase() === toId.toLowerCase() ||
      !isAllowedPair(fromType, toType, type)
    ) {
      return res.status(400).json({ message: "Invalid relationship" });
    }

    const [fromExists, toExists] = await Promise.all([
      entityExists(fromType, fromId, req.params.worldId, req.user.id),
      entityExists(toType, toId, req.params.worldId, req.user.id),
    ]);
    if (!fromExists || !toExists) {
      return res.status(400).json({ message: "Invalid entity" });
    }

    const duplicate = await Relationship.exists({
      worldId: req.params.worldId,
      fromId,
      toId,
      type,
      isDeleted: false,
    });
    if (duplicate) {
      return res.status(409).json({ message: "Relationship already exists" });
    }

    const relationship = await Relationship.create({
      worldId: req.params.worldId,
      ownerId: req.user.id,
      fromType,
      fromId,
      toType,
      toId,
      type,
      ...(notes !== undefined ? { notes } : {}),
    });

    return res.status(201).json(relationship);
  } catch (error) {
    console.error("Create relationship error:", error);
    return res.status(500).json({ message: "Server error creating relationship" });
  }
}

export async function getRelationships(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.worldId || typeof req.params.worldId !== "string") {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await verifyWorldOwnership(req.params.worldId, req.user.id);
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    let entityId: string | undefined;
    if (req.query.entityId !== undefined) {
      if (
        typeof req.query.entityId !== "string" ||
        !mongoose.isObjectIdOrHexString(req.query.entityId)
      ) {
        return res.status(400).json({ message: "Invalid entity id" });
      }
      entityId = req.query.entityId;
    }

    const filter = {
      worldId: req.params.worldId,
      ownerId: req.user.id,
      isDeleted: false,
      ...(entityId
        ? { $or: [{ fromId: entityId }, { toId: entityId }] }
        : {}),
    };

    const relationships = await Relationship.find(filter);
    return res.status(200).json(relationships);
  } catch (error) {
    console.error("Get relationships error:", error);
    return res.status(500).json({ message: "Server error fetching relationships" });
  }
}

export async function deleteRelationship(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "Relationship id is required" });
    }

    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ message: "Invalid relationship id" });
    }

    const relationship = await Relationship.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user.id,
        isDeleted: false,
      },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!relationship) {
      return res.status(404).json({ message: "Relationship not found" });
    }

    return res
      .status(200)
      .json({ message: "Relationship deleted successfully" });
  } catch (error) {
    console.error("Delete relationship error:", error);
    return res.status(500).json({ message: "Server error deleting relationship" });
  }
}
