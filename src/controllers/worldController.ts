import type { Request, Response } from "express";
import { World } from "../models/World.js";

export async function createWorld(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { name, genre, description, technologyLevel, magicLevel, historicalStartingPoint } = req.body;

    if (!name || !genre) {
      return res.status(400).json({ message: "Name and genre are required" });
    }

    const world = await World.create({
      name,
      genre,
      description,
      technologyLevel,
      magicLevel,
      historicalStartingPoint,
      ownerId: req.user.id,
    });

    return res.status(201).json(world);
  } catch (error) {
    console.error("Create world error:", error);
    return res.status(500).json({ message: "Server error creating world" });
  }
}

export async function getWorlds(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const worlds = await World.find({ ownerId: req.user.id, isDeleted: false });
    return res.status(200).json(worlds);
  } catch (error) {
    console.error("Get worlds error:", error);
    return res.status(500).json({ message: "Server error fetching worlds" });
  }
}

export async function getWorldById(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id) {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await World.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      isDeleted: false,
    });

    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    return res.status(200).json(world);
  } catch (error) {
    console.error("Get world by id error:", error);
    return res.status(500).json({ message: "Server error fetching world" });
  }
}
export async function updateWorld(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id) {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await World.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    return res.status(200).json(world);
  } catch (error) {
    console.error("Update world error:", error);
    return res.status(500).json({ message: "Server error updating world" });
  }
}

export async function deleteWorld(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id) {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await World.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    return res.status(200).json({ message: "World deleted successfully" });
  } catch (error) {
    console.error("Delete world error:", error);
    return res.status(500).json({ message: "Server error deleting world" });
  }
}