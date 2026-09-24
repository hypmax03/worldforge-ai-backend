import type { Request, Response } from "express";
import { Kingdom } from "../models/Kingdom.js";
import { World } from "../models/World.js";

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

    const kingdom = await Kingdom.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
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

    if (!req.params.id) {
      return res.status(400).json({ message: "Kingdom id is required" });
    }

    const kingdom = await Kingdom.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    return res.status(200).json({ message: "Kingdom deleted successfully" });
  } catch (error) {
    console.error("Delete kingdom error:", error);
    return res.status(500).json({ message: "Server error deleting kingdom" });
  }
}