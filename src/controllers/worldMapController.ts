import mongoose from "mongoose";
import type { Request, Response } from "express";
import { City } from "../models/City.js";
import { Kingdom } from "../models/Kingdom.js";
import { World } from "../models/World.js";

type MapPosition = {
  id: string;
  x: number;
  y: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMapPosition(value: unknown): value is MapPosition {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    value.x >= 0 &&
    value.x <= 1000 &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    value.y >= 0 &&
    value.y <= 1000
  );
}

export async function getWorldMap(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (typeof req.params.worldId !== "string" || !req.params.worldId) {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await World.findOne({
      _id: req.params.worldId,
      ownerId: userId,
      isDeleted: false,
    });
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    const [kingdoms, cities] = await Promise.all([
      Kingdom.find({
        worldId: world._id,
        ownerId: userId,
        isDeleted: false,
      }).select("name population mapX mapY rulerId"),
      City.find({
        worldId: world._id,
        ownerId: userId,
        isDeleted: false,
      }).select("name kingdomId population mapX mapY"),
    ]);

    return res.status(200).json({
      kingdoms: kingdoms.map((kingdom) => ({
        id: kingdom._id.toString(),
        name: kingdom.name,
        population: kingdom.population,
        mapX: kingdom.mapX ?? null,
        mapY: kingdom.mapY ?? null,
        rulerId: kingdom.rulerId?.toString() ?? null,
      })),
      cities: cities.map((city) => ({
        id: city._id.toString(),
        name: city.name,
        kingdomId: city.kingdomId.toString(),
        population: city.population,
        mapX: city.mapX ?? null,
        mapY: city.mapY ?? null,
      })),
    });
  } catch (error) {
    console.error("Get world map error:", error);
    return res.status(500).json({ message: "Server error fetching world map" });
  }
}

export async function updateWorldMap(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (typeof req.params.worldId !== "string" || !req.params.worldId) {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await World.findOne({
      _id: req.params.worldId,
      ownerId: userId,
      isDeleted: false,
    });
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    if (
      !isRecord(req.body) ||
      !Array.isArray(req.body.kingdoms) ||
      !Array.isArray(req.body.cities) ||
      req.body.kingdoms.length > 200 ||
      req.body.cities.length > 200 ||
      !req.body.kingdoms.every(isMapPosition) ||
      !req.body.cities.every(isMapPosition)
    ) {
      return res.status(400).json({ message: "Invalid map payload" });
    }

    const kingdomPositions = req.body.kingdoms;
    const cityPositions = req.body.cities;
    if (
      kingdomPositions.some(
        ({ id }) => !mongoose.isObjectIdOrHexString(id)
      ) ||
      cityPositions.some(({ id }) => !mongoose.isObjectIdOrHexString(id))
    ) {
      return res.status(400).json({ message: "Invalid entity" });
    }

    const [kingdoms, cities] = await Promise.all([
      Kingdom.find({
        _id: { $in: kingdomPositions.map(({ id }) => id) },
        worldId: world._id,
        ownerId: userId,
        isDeleted: false,
      }).select("_id"),
      City.find({
        _id: { $in: cityPositions.map(({ id }) => id) },
        worldId: world._id,
        ownerId: userId,
        isDeleted: false,
      }).select("_id"),
    ]);

    const foundKingdomIds = new Set(kingdoms.map(({ _id }) => _id.toString()));
    const foundCityIds = new Set(cities.map(({ _id }) => _id.toString()));
    if (
      kingdomPositions.some(({ id }) => !foundKingdomIds.has(id)) ||
      cityPositions.some(({ id }) => !foundCityIds.has(id))
    ) {
      return res.status(400).json({ message: "Invalid entity" });
    }

    const [kingdomResult, cityResult] = await Promise.all([
      kingdomPositions.length
        ? Kingdom.bulkWrite(
            kingdomPositions.map(({ id, x, y }) => ({
              updateOne: {
                filter: {
                  _id: id,
                  worldId: world._id,
                  ownerId: userId,
                  isDeleted: false,
                },
                update: { $set: { mapX: x, mapY: y } },
              },
            }))
          )
        : Promise.resolve(null),
      cityPositions.length
        ? City.bulkWrite(
            cityPositions.map(({ id, x, y }) => ({
              updateOne: {
                filter: {
                  _id: id,
                  worldId: world._id,
                  ownerId: userId,
                  isDeleted: false,
                },
                update: { $set: { mapX: x, mapY: y } },
              },
            }))
          )
        : Promise.resolve(null),
    ]);

    const updated =
      (kingdomResult?.matchedCount ?? 0) + (cityResult?.matchedCount ?? 0);
    return res.status(200).json({ updated });
  } catch (error) {
    console.error("Update world map error:", error);
    return res.status(500).json({ message: "Server error updating world map" });
  }
}
