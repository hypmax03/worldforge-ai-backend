import type { Request, Response } from "express";
import { Character } from "../models/Character.js";
import { World } from "../models/World.js";

async function verifyWorldOwnership(worldId: string, userId: string) {
  return World.findOne({ _id: worldId, ownerId: userId, isDeleted: false });
}

export async function createCharacter(req: Request, res: Response) {
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

    const {
      name,
      age,
      gender,
      race,
      occupation,
      kingdomId,
      cityId,
      biography,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const character = await Character.create({
      worldId: req.params.worldId,
      ownerId: req.user.id,
      name,
      age,
      gender,
      race,
      occupation,
      kingdomId,
      cityId,
      biography,
    });

    return res.status(201).json(character);
  } catch (error) {
    console.error("Create character error:", error);
    return res.status(500).json({ message: "Server error creating character" });
  }
}

export async function getCharacters(req: Request, res: Response) {
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

    const characters = await Character.find({
      worldId: req.params.worldId,
      isDeleted: false,
    });
    return res.status(200).json(characters);
  } catch (error) {
    console.error("Get characters error:", error);
    return res.status(500).json({ message: "Server error fetching characters" });
  }
}

export async function getCharacterById(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "Character id is required" });
    }

    const character = await Character.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      isDeleted: false,
    });

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    return res.status(200).json(character);
  } catch (error) {
    console.error("Get character by id error:", error);
    return res.status(500).json({ message: "Server error fetching character" });
  }
}

export async function updateCharacter(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "Character id is required" });
    }

    const character = await Character.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    return res.status(200).json(character);
  } catch (error) {
    console.error("Update character error:", error);
    return res.status(500).json({ message: "Server error updating character" });
  }
}

export async function deleteCharacter(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "Character id is required" });
    }

    const character = await Character.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    return res.status(200).json({ message: "Character deleted successfully" });
  } catch (error) {
    console.error("Delete character error:", error);
    return res.status(500).json({ message: "Server error deleting character" });
  }
}
