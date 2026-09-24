import type { Request, Response } from "express";
import { City } from "../models/City.js";
import { Kingdom } from "../models/Kingdom.js";

async function verifyKingdomOwnership(kingdomId: string, userId: string) {
  return Kingdom.findOne({ _id: kingdomId, ownerId: userId, isDeleted: false });
}

export async function createCity(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.kingdomId || typeof req.params.kingdomId !== "string") {
      return res.status(400).json({ message: "Kingdom id is required" });
    }

    const kingdom = await verifyKingdomOwnership(req.params.kingdomId, req.user.id);
    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    const { name, population, government } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const city = await City.create({
      worldId: kingdom.worldId,
      kingdomId: req.params.kingdomId,
      ownerId: req.user.id,
      name,
      population,
      government,
    });

    return res.status(201).json(city);
  } catch (error) {
    console.error("Create city error:", error);
    return res.status(500).json({ message: "Server error creating city" });
  }
}

export async function getCities(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.kingdomId || typeof req.params.kingdomId !== "string") {
      return res.status(400).json({ message: "Kingdom id is required" });
    }

    const kingdom = await verifyKingdomOwnership(req.params.kingdomId, req.user.id);
    if (!kingdom) {
      return res.status(404).json({ message: "Kingdom not found" });
    }

    const cities = await City.find({ kingdomId: req.params.kingdomId, isDeleted: false });
    return res.status(200).json(cities);
  } catch (error) {
    console.error("Get cities error:", error);
    return res.status(500).json({ message: "Server error fetching cities" });
  }
}

export async function getCityById(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "City id is required" });
    }

    const city = await City.findOne({
      _id: req.params.id,
      ownerId: req.user.id,
      isDeleted: false,
    });

    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    return res.status(200).json(city);
  } catch (error) {
    console.error("Get city by id error:", error);
    return res.status(500).json({ message: "Server error fetching city" });
  }
}

export async function updateCity(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "City id is required" });
    }

    const city = await City.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    return res.status(200).json(city);
  } catch (error) {
    console.error("Update city error:", error);
    return res.status(500).json({ message: "Server error updating city" });
  }
}

export async function deleteCity(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.id || typeof req.params.id !== "string") {
      return res.status(400).json({ message: "City id is required" });
    }

    const city = await City.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id, isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!city) {
      return res.status(404).json({ message: "City not found" });
    }

    return res.status(200).json({ message: "City deleted successfully" });
  } catch (error) {
    console.error("Delete city error:", error);
    return res.status(500).json({ message: "Server error deleting city" });
  }
}
