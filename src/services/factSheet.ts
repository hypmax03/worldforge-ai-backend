type FactId = string | { toString(): string };

interface FactEntity {
  _id: FactId;
  name: string;
  isDeleted?: boolean;
}

interface FactWorld {
  name: string;
  genre: string;
  description?: string;
  technologyLevel?: string;
  magicLevel?: string;
  historicalStartingPoint?: string;
  currentYear: number;
}

interface FactKingdom extends FactEntity {
  government?: string;
  population?: number;
  rulerId?: FactId | null;
  capitalCityId?: FactId | null;
}

interface FactCity extends FactEntity {
  kingdomId: FactId;
  government?: string;
  population?: number;
}

interface FactCharacter extends FactEntity {
  age?: number;
  isAlive: boolean;
  occupation?: string;
  kingdomId?: FactId | null;
  cityId?: FactId | null;
  biography?: string;
}

interface FactRelationship {
  fromType: string;
  fromId: FactId;
  toType: string;
  toId: FactId;
  type: string;
  isDeleted?: boolean;
}

interface FactEvent {
  _id: FactId;
  title: string;
  name?: string;
  isDeleted?: boolean;
  year: number;
  description?: string;
  category: string;
  characterIds?: FactId[];
  kingdomIds?: FactId[];
  cityIds?: FactId[];
}

export interface FactSheetInput {
  world: FactWorld;
  kingdoms: FactKingdom[];
  cities: FactCity[];
  characters: FactCharacter[];
  relationships: FactRelationship[];
  events: FactEvent[];
}

export interface FactSheetOptions {
  focus?: string;
  maxChars?: number;
}

interface FactEntry {
  section: "Kingdoms" | "Cities" | "Characters" | "Timeline";
  value: Record<string, unknown>;
  priority: boolean;
  year?: number;
  orderKey: string;
}

const idOf = (id: FactId | null | undefined) =>
  id === null || id === undefined ? null : id.toString();

function nameSort(a: FactEntity, b: FactEntity): number {
  return (
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
    idOf(a._id)!.localeCompare(idOf(b._id)!)
  );
}

function safeFactBlock(tag: string, value: unknown): string {
  const serialized = JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
  return `<${tag}>\n${serialized}\n</${tag}>`;
}

export function buildFactSheet(
  input: FactSheetInput,
  options: FactSheetOptions = {}
): string {
  const maxChars = Number.isFinite(options.maxChars)
    ? Math.max(0, Math.floor(options.maxChars!))
    : 6000;
  const focus = (options.focus ?? "").toLowerCase();
  const kingdoms = input.kingdoms.filter((item) => !item.isDeleted);
  const cities = input.cities.filter((item) => !item.isDeleted);
  const characters = input.characters.filter((item) => !item.isDeleted);
  const relationships = input.relationships.filter(
    (item) => !item.isDeleted
  );
  const events = input.events.filter((item) => !item.isDeleted);
  const kingdomById = new Map(kingdoms.map((item) => [idOf(item._id)!, item]));
  const cityById = new Map(cities.map((item) => [idOf(item._id)!, item]));
  const characterById = new Map(
    characters.map((item) => [idOf(item._id)!, item])
  );
  const adjacent = new Map<string, Set<string>>();
  const connect = (a: FactId | null | undefined, b: FactId | null | undefined) => {
    const first = idOf(a);
    const second = idOf(b);
    if (!first || !second) return;
    const firstLinks = adjacent.get(first) ?? new Set<string>();
    const secondLinks = adjacent.get(second) ?? new Set<string>();
    firstLinks.add(second);
    secondLinks.add(first);
    adjacent.set(first, firstLinks);
    adjacent.set(second, secondLinks);
  };

  for (const city of cities) connect(city._id, city.kingdomId);
  for (const kingdom of kingdoms) {
    connect(kingdom._id, kingdom.rulerId);
    connect(kingdom._id, kingdom.capitalCityId);
  }
  for (const character of characters) {
    connect(character._id, character.kingdomId);
    connect(character._id, character.cityId);
  }
  for (const relationship of relationships) {
    connect(relationship.fromId, relationship.toId);
  }
  for (const event of events) {
    for (const characterId of event.characterIds ?? []) connect(event._id, characterId);
    for (const kingdomId of event.kingdomIds ?? []) connect(event._id, kingdomId);
    for (const cityId of event.cityIds ?? []) connect(event._id, cityId);
  }

  const focusSeeds = new Set<string>();
  const addIfFocused = (entity: FactEntity) => {
    const normalizedName = entity.name.toLowerCase();
    if (
      focus &&
      normalizedName &&
      (normalizedName.includes(focus) || focus.includes(normalizedName))
    ) {
      focusSeeds.add(idOf(entity._id)!);
    }
  };
  [...kingdoms, ...cities, ...characters].forEach(addIfFocused);
  for (const event of events) {
    const normalizedTitle = event.title.toLowerCase();
    if (
      focus &&
      normalizedTitle &&
      (normalizedTitle.includes(focus) || focus.includes(normalizedTitle))
    ) {
      focusSeeds.add(idOf(event._id)!);
    }
  }
  const prioritizedIds = new Set(focusSeeds);
  for (const seed of focusSeeds) {
    for (const linkedId of adjacent.get(seed) ?? []) prioritizedIds.add(linkedId);
  }

  const kingdomsById = (ids: readonly (FactId | null | undefined)[]) =>
    ids
      .map((id) => kingdomById.get(idOf(id) ?? ""))
      .filter((item): item is FactKingdom => Boolean(item))
      .sort(nameSort);
  const citiesById = (ids: readonly (FactId | null | undefined)[]) =>
    ids
      .map((id) => cityById.get(idOf(id) ?? ""))
      .filter((item): item is FactCity => Boolean(item))
      .sort(nameSort);
  const charactersById = (ids: readonly (FactId | null | undefined)[]) =>
    ids
      .map((id) => characterById.get(idOf(id) ?? ""))
      .filter((item): item is FactCharacter => Boolean(item))
      .sort(nameSort);

  const entries: FactEntry[] = [];
  for (const kingdom of [...kingdoms].sort(nameSort)) {
    const kingdomRelationships = relationships.filter((relation) => {
      const isFrom =
        relation.fromType === "kingdom" &&
        idOf(relation.fromId) === idOf(kingdom._id);
      const isTo =
        relation.toType === "kingdom" &&
        idOf(relation.toId) === idOf(kingdom._id);
      return (
        (isFrom || isTo) &&
        (isFrom ? relation.toType : relation.fromType) === "kingdom"
      );
    });
    const linkedKingdomNames = (types: readonly string[]) =>
      kingdomRelationships
        .filter((relation) => types.includes(relation.type))
        .map((relation) =>
          kingdomById.get(
            idOf(
              relation.fromType === "kingdom" &&
                idOf(relation.fromId) === idOf(kingdom._id)
                ? relation.toId
                : relation.fromId
            ) ?? ""
          )
        )
        .filter((item): item is FactKingdom => Boolean(item))
        .sort(nameSort)
        .map((item) => item.name);
    const ruler = characterById.get(idOf(kingdom.rulerId) ?? "");
    const capital = cityById.get(idOf(kingdom.capitalCityId) ?? "");
    entries.push({
      section: "Kingdoms",
      priority: prioritizedIds.has(idOf(kingdom._id)!),
      orderKey: `${kingdom.name.toLowerCase()}:${idOf(kingdom._id)}`,
      value: {
        name: kingdom.name,
        government: kingdom.government ?? "",
        population: kingdom.population ?? 0,
        ruler: ruler?.name ?? null,
        capital: capital?.name ?? null,
        allies: linkedKingdomNames(["allied_with", "ally"]),
        enemies: linkedKingdomNames(["enemy", "at_war_with"]),
        wars: linkedKingdomNames(["at_war_with"]),
      },
    });
  }

  for (const city of [...cities].sort(nameSort)) {
    const kingdom = kingdomById.get(idOf(city.kingdomId)!);
    entries.push({
      section: "Cities",
      priority: prioritizedIds.has(idOf(city._id)!),
      orderKey: `${city.name.toLowerCase()}:${idOf(city._id)}`,
      value: {
        name: city.name,
        kingdom: kingdom?.name ?? null,
        government: city.government ?? "",
        population: city.population ?? 0,
      },
    });
  }

  for (const character of [...characters].sort(nameSort)) {
    const characterRelationships = relationships.filter(
      (relation) =>
        (relation.fromType === "character" &&
          idOf(relation.fromId) === idOf(character._id)) ||
        (relation.toType === "character" &&
          idOf(relation.toId) === idOf(character._id))
    );
    const links = characterRelationships
      .map((relation) => {
        const isFrom =
          relation.fromType === "character" &&
          idOf(relation.fromId) === idOf(character._id);
        const otherId = isFrom ? relation.toId : relation.fromId;
        const otherType = isFrom ? relation.toType : relation.fromType;
        const other =
          otherType === "character"
            ? characterById.get(idOf(otherId) ?? "")
            : kingdomById.get(idOf(otherId) ?? "");
        return other ? `${relation.type}: ${other.name}` : null;
      })
      .filter((value): value is string => value !== null)
      .sort((a, b) => a.localeCompare(b));
    entries.push({
      section: "Characters",
      priority: prioritizedIds.has(idOf(character._id)!),
      orderKey: `${character.name.toLowerCase()}:${idOf(character._id)}`,
      value: {
        name: character.name,
        age: character.age ?? 0,
        status: character.isAlive ? "alive" : "dead",
        occupation: character.occupation ?? "",
        kingdom: kingdomById.get(idOf(character.kingdomId) ?? "")?.name ?? null,
        city: cityById.get(idOf(character.cityId) ?? "")?.name ?? null,
        relationships: links,
      },
    });
  }

  for (const event of events) {
    entries.push({
      section: "Timeline",
      priority: prioritizedIds.has(idOf(event._id)!),
      year: event.year,
      orderKey: `${String(event.year).padStart(12, "0")}:${event.title.toLowerCase()}:${idOf(event._id)}`,
      value: {
        year: event.year,
        title: event.title,
        category: event.category,
        characters: charactersById(event.characterIds ?? []).map(
          (item) => item.name
        ),
        kingdoms: kingdomsById(event.kingdomIds ?? []).map((item) => item.name),
        cities: citiesById(event.cityIds ?? []).map((item) => item.name),
      },
    });
  }

  const worldFacts = {
    name: input.world.name,
    genre: input.world.genre,
    description: input.world.description ?? "",
    technologyLevel: input.world.technologyLevel ?? "",
    magicLevel: input.world.magicLevel ?? "",
    historicalStartingPoint: input.world.historicalStartingPoint ?? "",
    currentYear: input.world.currentYear,
  };
  const worldSection = `World\n${safeFactBlock("world_data", worldFacts)}`;
  if (maxChars === 0) return "";

  const prioritizedEntities = entries
    .filter((entry) => entry.priority)
    .sort((a, b) => a.orderKey.localeCompare(b.orderKey));
  const otherEntities = entries
    .filter((entry) => entry.section !== "Timeline" && !entry.priority)
    .sort(
      (a, b) =>
        ["Kingdoms", "Cities", "Characters"].indexOf(a.section) -
          ["Kingdoms", "Cities", "Characters"].indexOf(b.section) ||
        a.orderKey.localeCompare(b.orderKey)
    );
  const newestEvents = entries
    .filter((entry) => entry.section === "Timeline" && !entry.priority)
    .sort(
      (a, b) =>
        (b.year ?? 0) - (a.year ?? 0) ||
        a.orderKey.localeCompare(b.orderKey)
    );
  const selectionOrder = [...prioritizedEntities, ...otherEntities, ...newestEvents];
  const selected = new Set<FactEntry>();

  const render = (omittedCount: number) => {
    const sectionParts: string[] = [worldSection];
    for (const section of [
      "Kingdoms",
      "Cities",
      "Characters",
      "Timeline",
    ] as const) {
      const values = entries
        .filter((entry) => entry.section === section && selected.has(entry))
        .sort((a, b) =>
          section === "Timeline"
            ? (a.year ?? 0) - (b.year ?? 0) || a.orderKey.localeCompare(b.orderKey)
            : a.orderKey.localeCompare(b.orderKey)
        )
        .map((entry) => entry.value);
      sectionParts.push(
        `${section}\n${safeFactBlock(`${section.toLowerCase()}_data`, values)}`
      );
    }
    if (omittedCount > 0) {
      sectionParts.push(`(${omittedCount} more omitted)`);
    }
    return sectionParts.join("\n\n");
  };

  for (const entry of selectionOrder) {
    selected.add(entry);
    const omitted = entries.length - selected.size;
    if (render(omitted).length > maxChars) selected.delete(entry);
  }

  let output = render(entries.length - selected.size);
  while (output.length > maxChars && selected.size > 0) {
    const lastSelected = [...selectionOrder]
      .reverse()
      .find((entry) => selected.has(entry));
    if (!lastSelected) break;
    selected.delete(lastSelected);
    output = render(entries.length - selected.size);
  }
  if (output.length <= maxChars) return output;

  const omittedMarker = `(${entries.length - selected.size} more omitted)`;
  const compactPrefix = "World\n<world_data>\n";
  const compactSuffix = `\n</world_data>\n\n${omittedMarker}`;
  if (compactPrefix.length + compactSuffix.length + 2 > maxChars) {
    return omittedMarker.slice(0, maxChars);
  }

  let name = input.world.name;
  const compactWorldBlock = () =>
    `${compactPrefix}${JSON.stringify({ name })
      .replaceAll("<", "\\u003c")
      .replaceAll(">", "\\u003e")
      .replaceAll("&", "\\u0026")}${compactSuffix}`;
  while (compactWorldBlock().length > maxChars && name.length > 0) {
    name = name.slice(0, -1);
  }
  return compactWorldBlock().slice(0, maxChars);
}
