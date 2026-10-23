import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Event } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import { World } from "../models/World.js";
import { runSimulation } from "../simulation/engine.js";
import type { KingdomState, SimEvent } from "../simulation/types.js";

const simulationRequestSchema = z.object({
  years: z.number().int().min(1).max(20),
  preview: z.boolean().optional(),
  seed: z.number().int().optional(),
});

function createRandomSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000);
}

function eventExists(
  event: SimEvent,
  existingEvents: readonly { year: number; title: string }[]
): boolean {
  const normalizedTitle = event.title.toLowerCase();
  return existingEvents.some(
    (existing) =>
      existing.year === event.year &&
      existing.title.toLowerCase() === normalizedTitle
  );
}

export async function simulateWorld(req: Request, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!req.params.worldId || typeof req.params.worldId !== "string") {
      return res.status(400).json({ message: "World id is required" });
    }
    if (!mongoose.isObjectIdOrHexString(req.params.worldId)) {
      return res.status(404).json({ message: "World not found" });
    }

    const world = await World.findOne({
      _id: req.params.worldId,
      ownerId: req.user.id,
      isDeleted: false,
    });
    if (!world) {
      return res.status(404).json({ message: "World not found" });
    }

    const requestResult = simulationRequestSchema.safeParse(req.body);
    if (!requestResult.success) {
      return res.status(400).json({
        message: "Years must be an integer between 1 and 20; preview must be a boolean and seed must be an integer",
      });
    }

    const kingdoms = await Kingdom.find({
      worldId: world._id,
      isDeleted: false,
    })
      .select("_id name population food stability droughtYearsLeft")
      .lean();

    if (kingdoms.length === 0) {
      return res.status(400).json({ message: "Add a kingdom before simulating" });
    }

    const kingdomStates: KingdomState[] = kingdoms.map((kingdom) => {
      const population = kingdom.population ?? 0;
      const food = kingdom.food ?? 0;
      const stability = kingdom.stability ?? 70;
      const droughtYearsLeft = kingdom.droughtYearsLeft ?? 0;
      const shouldInitializeFood =
        food === 0 &&
        population > 0 &&
        stability === 70 &&
        droughtYearsLeft === 0;

      return {
        id: String(kingdom._id),
        name: kingdom.name,
        population,
        food: shouldInitializeFood ? population * 1.5 : food,
        stability,
        droughtYearsLeft,
      };
    });

    const fromYear = world.currentYear + 1;
    const seed = requestResult.data.seed ?? createRandomSeed();
    const simulation = runSimulation(
      kingdomStates,
      fromYear,
      requestResult.data.years,
      seed
    );

    const existingEvents = await Event.find({
      worldId: world._id,
      isDeleted: false,
      year: { $gte: fromYear, $lte: fromYear + requestResult.data.years - 1 },
    })
      .select("year title")
      .lean();
    const events = simulation.events.filter(
      (event) => !eventExists(event, existingEvents)
    );
    const eventsByYear = new Map<number, number>();
    for (const event of events) {
      eventsByYear.set(event.year, (eventsByYear.get(event.year) ?? 0) + 1);
    }
    const summary = simulation.summary.map((yearSummary) => ({
      ...yearSummary,
      eventCount: eventsByYear.get(yearSummary.year) ?? 0,
    }));
    const toYear = fromYear + summary.length - 1;

    if (!requestResult.data.preview) {
      await Kingdom.bulkWrite(
        simulation.kingdoms.map((kingdom) => ({
          updateOne: {
            filter: { _id: kingdom.id, worldId: world._id, isDeleted: false },
            update: {
              $set: {
                population: kingdom.population,
                food: kingdom.food,
                stability: kingdom.stability,
                droughtYearsLeft: kingdom.droughtYearsLeft,
              },
            },
          },
        }))
      );

      if (events.length > 0) {
        await Event.insertMany(
          events.map((event) => ({
            worldId: world._id,
            ownerId: req.user?.id,
            year: event.year,
            title: event.title,
            description: event.description,
            category: event.category,
            characterIds: [],
            kingdomIds: [event.kingdomId],
            cityIds: [],
            source: "simulation" as const,
          }))
        );
      }

      await World.updateOne(
        { _id: world._id, ownerId: req.user.id, isDeleted: false },
        { $set: { currentYear: toYear } },
        { runValidators: true }
      );
    }

    return res.status(200).json({
      fromYear,
      toYear,
      seed,
      truncated: simulation.truncated,
      summary,
      events: events.map(({ title, year, category }) => ({
        title,
        year,
        category,
      })),
      kingdoms: simulation.kingdoms.map(
        ({ name, population, food, stability }) => ({
          name,
          population,
          food,
          stability,
        })
      ),
    });
  } catch (error) {
    console.error("Simulate world error:", error);
    return res.status(500).json({ message: "Server error simulating world" });
  }
}
