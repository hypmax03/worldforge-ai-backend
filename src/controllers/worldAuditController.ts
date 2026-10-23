import type { Request, Response } from "express";
import { Character } from "../models/Character.js";
import { City } from "../models/City.js";
import { Event } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import { Relationship } from "../models/Relationship.js";
import { World } from "../models/World.js";
import { auditWorld } from "../services/worldAudit.js";

export async function getWorldAudit(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const worldId = req.params.worldId;
    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }
    if (typeof worldId !== "string" || !worldId) {
      return res.status(400).json({ message: "World id is required" });
    }

    const world = await World.findOne({
      _id: worldId,
      ownerId: userId,
      isDeleted: false,
    });
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    const filter = {
      worldId: world._id,
      ownerId: userId,
      isDeleted: false,
    };
    const [kingdoms, cities, characters, relationships, events] =
      await Promise.all([
        Kingdom.find(filter),
        City.find(filter),
        Character.find(filter),
        Relationship.find(filter),
        Event.find(filter),
      ]);

    const issues = auditWorld({
      world,
      kingdoms,
      cities,
      characters,
      relationships,
      events,
    });
    const counts = {
      error: issues.filter((issue) => issue.severity === "error").length,
      warning: issues.filter((issue) => issue.severity === "warning").length,
      info: issues.filter((issue) => issue.severity === "info").length,
    };
    return res.status(200).json({ issues, counts, checkedAt: new Date() });
  } catch (error) {
    console.error("Get world audit error:", error);
    return res.status(500).json({ message: "Server error auditing world" });
  }
}
