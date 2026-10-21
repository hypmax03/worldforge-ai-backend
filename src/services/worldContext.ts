import type { ICity } from "../models/City.js";
import type { IKingdom } from "../models/Kingdom.js";
import type { IWorld } from "../models/World.js";

function serializeDelimitedData(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

export function buildDataBlock(tag: string, value: unknown): string {
  return `<${tag}>\n${serializeDelimitedData(value)}\n</${tag}>`;
}

export function buildWorldContext(world: Pick<
  IWorld,
  | "name"
  | "genre"
  | "description"
  | "technologyLevel"
  | "magicLevel"
  | "historicalStartingPoint"
>): string {
  return buildDataBlock("world", {
    name: world.name,
    genre: world.genre,
    description: world.description,
    technologyLevel: world.technologyLevel,
    magicLevel: world.magicLevel,
    historicalStartingPoint: world.historicalStartingPoint,
  });
}

export function buildKingdomContext(
  kingdom: Pick<IKingdom, "name" | "government" | "population">
): string {
  return buildDataBlock("kingdom", {
    name: kingdom.name,
    government: kingdom.government,
    population: kingdom.population,
  });
}

export function buildCityContext(
  city: Pick<ICity, "name" | "government" | "population">
): string {
  return buildDataBlock("city", {
    name: city.name,
    government: city.government,
    population: city.population,
  });
}

export function listExistingNames(items: readonly { name: string }[]): string {
  return items.length > 0 ? items.map((item) => item.name).join(", ") : "none yet";
}
