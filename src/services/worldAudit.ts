type AuditId = string | { toString(): string };

interface AuditEntity {
  _id: AuditId;
  name: string;
  isDeleted?: boolean;
}

interface AuditKingdom extends AuditEntity {
  rulerId?: AuditId | null;
  capitalCityId?: AuditId | null;
}

interface AuditCity extends AuditEntity {
  kingdomId: AuditId;
}

interface AuditCharacter extends AuditEntity {
  isAlive: boolean;
  age: number;
  kingdomId?: AuditId | null;
  cityId?: AuditId | null;
}

interface AuditRelationship {
  fromType: string;
  fromId: AuditId;
  toType: string;
  toId: AuditId;
  type: string;
  isDeleted?: boolean;
}

interface AuditEvent {
  _id: AuditId;
  year: number;
  title: string;
  category: string;
  characterIds?: AuditId[];
  isDeleted?: boolean;
}

export interface WorldAuditInput {
  world: { currentYear: number };
  kingdoms: AuditKingdom[];
  cities: AuditCity[];
  characters: AuditCharacter[];
  relationships: AuditRelationship[];
  events: AuditEvent[];
}

export interface WorldAuditIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  entity?: {
    type: "kingdom" | "city" | "character" | "relationship" | "event";
    id: string;
    name: string;
  };
}

function eventRef(
  event: AuditEvent
): NonNullable<WorldAuditIssue["entity"]> {
  return { type: "event", id: idOf(event._id)!, name: event.title };
}

function idOf(id: AuditId | null | undefined): string | null {
  return id === null || id === undefined ? null : id.toString();
}

function entityRef(
  type: NonNullable<WorldAuditIssue["entity"]>["type"],
  entity: AuditEntity
): NonNullable<WorldAuditIssue["entity"]> {
  return { type, id: idOf(entity._id)!, name: entity.name };
}

export function auditWorld(input: WorldAuditInput): WorldAuditIssue[] {
  const {
    world,
    kingdoms: inputKingdoms,
    cities: inputCities,
    characters: inputCharacters,
    relationships: inputRelationships,
    events: inputEvents,
  } = input;
  const kingdoms = inputKingdoms.filter((entity) => !entity.isDeleted);
  const cities = inputCities.filter((entity) => !entity.isDeleted);
  const characters = inputCharacters.filter((entity) => !entity.isDeleted);
  const relationships = inputRelationships.filter(
    (relationship) => !relationship.isDeleted
  );
  const events = inputEvents.filter((event) => !event.isDeleted);
  const issues: WorldAuditIssue[] = [];
  const kingdomById = new Map(kingdoms.map((item) => [idOf(item._id)!, item]));
  const cityById = new Map(cities.map((item) => [idOf(item._id)!, item]));
  const characterById = new Map(
    characters.map((item) => [idOf(item._id)!, item])
  );
  const seenActiveEntities = {
    character: characterById,
    kingdom: kingdomById,
  };
  const activeRelationships = relationships;
  const activeEvents = events;

  for (const kingdom of kingdoms) {
    if (kingdom.capitalCityId) {
      const capital = cityById.get(idOf(kingdom.capitalCityId)!);
      if (!capital || idOf(capital.kingdomId) !== idOf(kingdom._id)) {
        issues.push({
          severity: "error",
          code: "invalid_kingdom_capital",
          message: `The capital assigned to ${kingdom.name} is not a city of that kingdom.`,
          entity: entityRef("kingdom", kingdom),
        });
      }
    }

    if (!kingdom.rulerId) continue;
    const ruler = characterById.get(idOf(kingdom.rulerId)!);
    if (ruler?.isAlive === false) {
      issues.push({
        severity: "warning",
        code: "deceased_kingdom_ruler",
        message: `${ruler.name} is marked deceased but still rules ${kingdom.name}.`,
        entity: entityRef("kingdom", kingdom),
      });
    }
    if (
      ruler?.kingdomId &&
      idOf(ruler.kingdomId) !== idOf(kingdom._id)
    ) {
      issues.push({
        severity: "warning",
        code: "ruler_kingdom_mismatch",
        message: `${ruler.name} rules ${kingdom.name} but is assigned to a different kingdom.`,
        entity: entityRef("kingdom", kingdom),
      });
    }
  }

  for (const character of characters) {
    if (character.cityId) {
      const city = cityById.get(idOf(character.cityId)!);
      if (
        !city ||
        (character.kingdomId !== null &&
          idOf(city.kingdomId) !== idOf(character.kingdomId)) ||
        character.kingdomId === null
      ) {
        issues.push({
          severity: "warning",
          code: "character_city_kingdom_mismatch",
          message: `${character.name}'s city does not belong to their kingdom.`,
          entity: entityRef("character", character),
        });
      }
    }
  }

  const parentEdges = activeRelationships.filter(
    (relationship) =>
      relationship.type === "parent" &&
      relationship.fromType === "character" &&
      relationship.toType === "character" &&
      characterById.has(idOf(relationship.fromId)!) &&
      characterById.has(idOf(relationship.toId)!)
  );
  const childrenByParent = new Map<string, string[]>();
  for (const relationship of parentEdges) {
    const parentId = idOf(relationship.fromId)!;
    const childId = idOf(relationship.toId)!;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(childId);
    childrenByParent.set(parentId, children);

    const parent = characterById.get(parentId)!;
    const child = characterById.get(childId)!;
    if (
      parent.isAlive &&
      child.isAlive &&
      Number.isFinite(parent.age) &&
      Number.isFinite(child.age) &&
      parent.age - child.age < 12
    ) {
      issues.push({
        severity: "warning",
        code: "parent_age_gap",
        message: `${parent.name} is less than 12 years older than their child ${child.name}.`,
        entity: entityRef("character", child),
      });
    }
  }

  const cycleCharacterIds = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];
  function findCycles(characterId: string) {
    if (visiting.has(characterId)) {
      const cycleStart = path.indexOf(characterId);
      for (const cycleId of path.slice(cycleStart)) {
        cycleCharacterIds.add(cycleId);
      }
      return;
    }
    if (visited.has(characterId)) return;
    visiting.add(characterId);
    path.push(characterId);
    for (const childId of childrenByParent.get(characterId) ?? []) {
      findCycles(childId);
    }
    path.pop();
    visiting.delete(characterId);
    visited.add(characterId);
  }
  for (const characterId of characterById.keys()) findCycles(characterId);
  for (const characterId of cycleCharacterIds) {
    const character = characterById.get(characterId)!;
    issues.push({
      severity: "error",
      code: "ancestor_cycle",
      message: `${character.name} is their own ancestor through parent relationships.`,
      entity: entityRef("character", character),
    });
  }

  for (const relationship of activeRelationships) {
    const fromMap =
      relationship.fromType === "character"
        ? seenActiveEntities.character
        : relationship.fromType === "kingdom"
          ? seenActiveEntities.kingdom
          : undefined;
    const toMap =
      relationship.toType === "character"
        ? seenActiveEntities.character
        : relationship.toType === "kingdom"
          ? seenActiveEntities.kingdom
          : undefined;
    if (
      !fromMap?.has(idOf(relationship.fromId)!) ||
      !toMap?.has(idOf(relationship.toId)!)
    ) {
      issues.push({
        severity: "error",
        code: "relationship_missing_entity",
        message: `A ${relationship.type} relationship references a missing or deleted entity.`,
        entity: {
          type: "relationship",
          id: `${idOf(relationship.fromId)}:${idOf(relationship.toId)}:${relationship.type}`,
          name: `${relationship.fromType} to ${relationship.toType}`,
        },
      });
    }
  }

  const kingdomPairRelations = new Map<string, Set<string>>();
  for (const relationship of activeRelationships) {
    if (
      relationship.fromType !== "kingdom" ||
      relationship.toType !== "kingdom" ||
      !["at_war_with", "allied_with"].includes(relationship.type)
    ) {
      continue;
    }
    const pair = [idOf(relationship.fromId)!, idOf(relationship.toId)!]
      .sort()
      .join(":");
    const types = kingdomPairRelations.get(pair) ?? new Set<string>();
    types.add(relationship.type);
    kingdomPairRelations.set(pair, types);
  }
  for (const [pair, types] of kingdomPairRelations) {
    if (!types.has("at_war_with") || !types.has("allied_with")) continue;
    const [firstId, secondId] = pair.split(":");
    const kingdom = kingdomById.get(firstId!) ?? kingdomById.get(secondId!);
    if (!kingdom) continue;
    issues.push({
      severity: "error",
      code: "conflicting_kingdom_relations",
      message: "The same kingdom pair is both at war and allied.",
      entity: entityRef("kingdom", kingdom),
    });
  }

  const deathYearByCharacter = new Map<string, number>();
  for (const event of activeEvents) {
    if (event.category !== "death") continue;
    for (const characterId of event.characterIds ?? []) {
      const key = idOf(characterId)!;
      const currentYear = deathYearByCharacter.get(key);
      if (currentYear === undefined || event.year < currentYear) {
        deathYearByCharacter.set(key, event.year);
      }
    }
  }

  for (const character of characters) {
    const characterId = idOf(character._id)!;
    const deathYear = deathYearByCharacter.get(characterId);
    if (deathYear !== undefined && character.isAlive) {
      issues.push({
        severity: "warning",
        code: "alive_after_death_event",
        message: `${character.name} is marked alive despite having a death event.`,
        entity: entityRef("character", character),
      });
    } else if (deathYear === undefined && !character.isAlive) {
      issues.push({
        severity: "info",
        code: "missing_death_event",
        message: `${character.name} is marked deceased but has no death event.`,
        entity: entityRef("character", character),
      });
    }

    if (deathYear === undefined) continue;
    for (const event of activeEvents) {
      if (
        event.year > deathYear &&
        event.category !== "death" &&
        event.category !== "succession" &&
        (event.characterIds ?? []).some(
          (eventCharacterId) => idOf(eventCharacterId) === characterId
        )
      ) {
        issues.push({
          severity: "warning",
          code: "event_after_character_death",
          message: `${event.title} links to ${character.name} after their death event.`,
          entity: eventRef(event),
        });
      }
    }
  }

  const namedEntities: Array<{
    type: "kingdom" | "city" | "character";
    entity: AuditEntity;
  }> = [
    ...kingdoms.map((entity) => ({ type: "kingdom" as const, entity })),
    ...cities.map((entity) => ({ type: "city" as const, entity })),
    ...characters.map((entity) => ({ type: "character" as const, entity })),
  ];
  const names = new Map<string, AuditEntity>();
  for (const { type, entity } of namedEntities) {
    const key = `${type}:${entity.name.trim().toLowerCase()}`;
    if (names.has(key)) {
      issues.push({
        severity: "warning",
        code: "duplicate_entity_name",
        message: `Another ${type} has the same name: ${entity.name}.`,
        entity: entityRef(type, entity),
      });
    } else {
      names.set(key, entity);
    }
  }

  for (const event of activeEvents) {
    if (event.year > world.currentYear) {
      issues.push({
        severity: "info",
        code: "event_after_current_year",
        message: `${event.title} is dated after the world's current year.`,
        entity: eventRef(event),
      });
    }
  }

  return issues;
}
