import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Character } from "../models/Character.js";
import { City } from "../models/City.js";
import { Event } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import { Relationship } from "../models/Relationship.js";
import { softDeleteKingdom } from "../services/softDelete.js";
import { World } from "../models/World.js";
import { pickFields } from "../utils/pickFields.js";

async function verifyWorldOwnership(worldId: string, userId: string) {
  return World.findOne({ _id: worldId, ownerId: userId, isDeleted: false });
}

export async function createKingdom(req: Request, res: Response) {
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

    const { name, government, population } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const kingdom = await Kingdom.create({
      worldId: req.params.worldId,
      ownerId: req.user.id,
      name,
      government,
      population,
    });

    return res.status(201).json(kingdom);
  } catch (error) {
    console.error("Create kingdom error:", error);
    return res.status(500).json({ message: "Server error creating kingdom" });
  }
}

export async function getKingdoms(req: Request, res: Response) {
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

    const kingdoms = await Kingdom.find({ worldId: req.params.worldId, isDeleted: false });
    return res.status(200).json(kingdoms);
  } catch (error) {
    console.error("Get kingdoms error:", error);
    return res.status(500).json({ message: "Server error fetching kingdoms" });
  }
}

export async function getKingdomById(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id) {
      return res.status(400).json({ message: "Kingdom id is required" });
    }

    const kingdom = await Kingdom.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      isDeleted: false,
    });

    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    return res.status(200).json(kingdom);
  } catch (error) {
    console.error("Get kingdom by id error:", error);
    return res.status(500).json({ message: "Server error fetching kingdom" });
  }
}

export async function updateKingdom(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id) {
      return res.status(400).json({ message: "Kingdom id is required" });
    }

    const updates = pickFields<{
      name: string;
      government: string;
      population: number;
      rulerId: string | null;
      capitalCityId: string | null;
      mapX: number | null;
      mapY: number | null;
    }>(req.body, [
      "name",
      "government",
      "population",
      "rulerId",
      "capitalCityId",
      "mapX",
      "mapY",
    ]);

    for (const coordinate of ["mapX", "mapY"] as const) {
      if (
        Object.prototype.hasOwnProperty.call(updates, coordinate) &&
        updates[coordinate] !== null &&
        (typeof updates[coordinate] !== "number" ||
          !Number.isFinite(updates[coordinate]) ||
          updates[coordinate] < 0 ||
          updates[coordinate] > 1000)
      ) {
        return res.status(400).json({ message: `Invalid ${coordinate}` });
      }
    }

    const body =
      typeof req.body === "object" && req.body !== null ? req.body : {};
    const hasRecordSuccession = Object.prototype.hasOwnProperty.call(
      body,
      "recordSuccession"
    );
    if (hasRecordSuccession && typeof body.recordSuccession !== "boolean") {
      return res.status(400).json({ message: "Invalid recordSuccession" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const existingKingdom = await Kingdom.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      isDeleted: false,
    });
    if (!existingKingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    let ruler: Awaited<ReturnType<typeof Character.findOne>> = null;
    if (Object.prototype.hasOwnProperty.call(updates, "rulerId")) {
      if (
        updates.rulerId !== null &&
        (typeof updates.rulerId !== "string" ||
          !mongoose.isObjectIdOrHexString(updates.rulerId))
      ) {
        return res.status(400).json({ message: "Invalid ruler" });
      }

      if (updates.rulerId !== null) {
        ruler = await Character.findOne({
          _id: updates.rulerId,
          ownerId: req.user.id,
          worldId: existingKingdom.worldId,
          isDeleted: false,
        });
        if (!ruler) {
          return res.status(400).json({ message: "Invalid ruler" });
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "capitalCityId")) {
      if (
        updates.capitalCityId !== null &&
        (typeof updates.capitalCityId !== "string" ||
          !mongoose.isObjectIdOrHexString(updates.capitalCityId))
      ) {
        return res.status(400).json({ message: "Invalid capital" });
      }

      if (updates.capitalCityId !== null) {
        const capital = await City.findOne({
          _id: updates.capitalCityId,
          ownerId: req.user.id,
          kingdomId: existingKingdom._id,
          isDeleted: false,
        });
        if (!capital) {
          return res.status(400).json({ message: "Invalid capital" });
        }
      }
    }

    const rulerChanged =
      ruler !== null &&
      Object.prototype.hasOwnProperty.call(updates, "rulerId") &&
      ruler._id.toString() !== existingKingdom.rulerId?.toString();
    const shouldRecordSuccession =
      rulerChanged && body.recordSuccession === true;
    const world = shouldRecordSuccession
      ? await World.findOne({
          _id: existingKingdom.worldId,
          ownerId: req.user.id,
          isDeleted: false,
        })
      : null;

    if (shouldRecordSuccession && !world) {
      return res.status(404).json({ message: "World not found" });
    }

    const kingdom = await Kingdom.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    if (shouldRecordSuccession && world && ruler) {
      await Event.create({
        worldId: world._id,
        ownerId: req.user.id,
        year: world.currentYear,
        title: `${ruler.name} becomes ruler of ${kingdom.name}`,
        category: "succession",
        source: "manual",
        characterIds: [ruler._id],
        kingdomIds: [kingdom._id],
      });
    }

    return res.status(200).json(kingdom);
  } catch (error) {
    console.error("Update kingdom error:", error);
    return res.status(500).json({ message: "Server error updating kingdom" });
  }
}

export async function deleteKingdom(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (typeof req.params.id !== "string") {
      return res.status(400).json({ message: "Kingdom id is required" });
    }

    const kingdom = await softDeleteKingdom(req.params.id, req.user.id);

    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    return res.status(200).json({ message: "Kingdom deleted successfully" });
  } catch (error) {
    console.error("Delete kingdom error:", error);
    return res.status(500).json({ message: "Server error deleting kingdom" });
  }
}