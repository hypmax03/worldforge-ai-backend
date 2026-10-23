import type { Request, Response } from "express";
import { Character } from "../models/Character.js";
import { City } from "../models/City.js";
import { Event } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import { Relationship } from "../models/Relationship.js";
import { World } from "../models/World.js";
import { restoreEntity, type TrashType } from "../services/softDelete.js";

const restoreTypes = new Set<TrashType>([
  "worlds",
  "kingdoms",
  "cities",
  "characters",
  "events",
]);

export function validateTrashType(req: Request, res: Response, next: import("express").NextFunction) {
  if (!restoreTypes.has(req.params.type as TrashType)) {
    return res.status(400).json({ message: "Invalid trash type" });
  }
  return next();
}

export async function restoreTrashItem(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (typeof req.params.type !== "string" || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "Invalid trash item" });
    }
    const result = await restoreEntity(
      req.params.type as TrashType,
      req.params.id,
      req.user.id
    );
    if (result.status === 404) {
      return res.status(404).json({ message: "Item not found" });
    }
    if (result.status === 409) {
      return res.status(409).json({ message: "Restore the parent first" });
    }
    return res.status(200).json({ message: "Item restored successfully" });
  } catch (error) {
    console.error("Restore trash item error:", error);
    return res.status(500).json({ message: "Server error restoring item" });
  }
}

export async function getDeletedWorlds(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    const worlds = await World.find({
      ownerId: req.user.id,
      isDeleted: true,
      deletedWith: null,
    })
      .select("name deletedAt")
      .sort({ deletedAt: -1 })
      .lean();
    return res.status(200).json({
      worlds: worlds.map(({ _id, name, deletedAt }) => ({
        id: _id,
        name,
        deletedAt,
      })),
    });
  } catch (error) {
    console.error("Get deleted worlds error:", error);
    return res.status(500).json({ message: "Server error fetching trash" });
  }
}

export async function getWorldTrash(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (typeof req.params.worldId !== "string") {
      return res.status(400).json({ message: "World id is required" });
    }
    const world = await World.exists({
      _id: req.params.worldId,
      ownerId: req.user.id,
      isDeleted: false,
    });
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }
    const baseFilter = {
      worldId: req.params.worldId,
      ownerId: req.user.id,
      isDeleted: true,
      deletedWith: null,
    };
    const [kingdoms, cities, characters, events] = await Promise.all([
      Kingdom.find(baseFilter).select("name deletedAt").lean(),
      City.find(baseFilter).select("name deletedAt").lean(),
      Character.find(baseFilter).select("name deletedAt").lean(),
      Event.find(baseFilter).select("title deletedAt").lean(),
    ]);
    const newestFirst = <T extends { deletedAt: Date | null }>(items: T[]) =>
      items.sort((left, right) =>
        new Date(right.deletedAt ?? 0).getTime() -
        new Date(left.deletedAt ?? 0).getTime()
      );
    return res.status(200).json({
      kingdoms: newestFirst(
        kingdoms.map(({ _id, name, deletedAt }) => ({ id: _id, name, deletedAt }))
      ),
      cities: newestFirst(
        cities.map(({ _id, name, deletedAt }) => ({ id: _id, name, deletedAt }))
      ),
      characters: newestFirst(
        characters.map(({ _id, name, deletedAt }) => ({ id: _id, name, deletedAt }))
      ),
      events: newestFirst(
        events.map(({ _id, title, deletedAt }) => ({ id: _id, title, deletedAt }))
      ),
    });
  } catch (error) {
    console.error("Get world trash error:", error);
    return res.status(500).json({ message: "Server error fetching trash" });
  }
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "world";
}

export async function exportWorld(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (typeof req.params.worldId !== "string") {
      return res.status(400).json({ message: "World id is required" });
    }
    const world = await World.findOne({
      _id: req.params.worldId,
      ownerId: req.user.id,
      isDeleted: false,
    })
      .select("-ownerId -__v")
      .lean();
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }
    const filter = { worldId: world._id, ownerId: req.user.id, isDeleted: false };
    const [kingdoms, cities, characters, relationships, events] = await Promise.all([
      Kingdom.find(filter).select("-ownerId -__v").lean(),
      City.find(filter).select("-ownerId -__v").lean(),
      Character.find(filter).select("-ownerId -__v").lean(),
      Relationship.find(filter).select("-ownerId -__v").lean(),
      Event.find(filter).select("-ownerId -__v").lean(),
    ]);
    res.attachment(`${slugify(world.name)}.json`);
    return res.status(200).json({
      version: 1,
      exportedAt: new Date().toISOString(),
      world,
      kingdoms,
      cities,
      characters,
      relationships,
      events,
    });
  } catch (error) {
    console.error("Export world error:", error);
    return res.status(500).json({ message: "Server error exporting world" });
  }
}
