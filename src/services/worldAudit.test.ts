import { describe, expect, it } from "vitest";
import { auditWorld, type WorldAuditInput } from "./worldAudit.js";

const ids = {
  kingdom: "kingdom-1",
  otherKingdom: "kingdom-2",
  city: "city-1",
  otherCity: "city-2",
  character: "character-1",
  otherCharacter: "character-2",
};

function makeKingdom(
  id: string,
  name: string,
  overrides: Partial<WorldAuditInput["kingdoms"][number]> = {}
): WorldAuditInput["kingdoms"][number] {
  return { _id: id, name, ...overrides };
}

function makeCity(
  id: string,
  name: string,
  kingdomId: string,
  overrides: Partial<WorldAuditInput["cities"][number]> = {}
): WorldAuditInput["cities"][number] {
  return { _id: id, name, kingdomId, ...overrides };
}

function makeCharacter(
  id: string,
  name: string,
  overrides: Partial<WorldAuditInput["characters"][number]> = {}
): WorldAuditInput["characters"][number] {
  return {
    _id: id,
    name,
    age: 30,
    isAlive: true,
    kingdomId: null,
    cityId: null,
    ...overrides,
  };
}

function makeRelationship(
  fromId: string,
  toId: string,
  type: string,
  fromType = "character",
  toType = "character"
): WorldAuditInput["relationships"][number] {
  return { fromId, toId, type, fromType, toType };
}

function makeEvent(
  id: string,
  year: number,
  category: string,
  characterIds: string[] = [],
  title = `Event ${id}`
): WorldAuditInput["events"][number] {
  return { _id: id, year, category, characterIds, title };
}

function makeInput(): WorldAuditInput {
  return {
    world: { currentYear: 100 },
    kingdoms: [
      makeKingdom(ids.kingdom, "Eldoria"),
      makeKingdom(ids.otherKingdom, "Northreach"),
    ],
    cities: [
      makeCity(ids.city, "Aster", ids.kingdom),
      makeCity(ids.otherCity, "Brine", ids.otherKingdom),
    ],
    characters: [
      makeCharacter(ids.character, "Alaria", {
        age: 40,
        kingdomId: ids.kingdom,
        cityId: ids.city,
      }),
      makeCharacter(ids.otherCharacter, "Beren", {
        age: 20,
        kingdomId: ids.otherKingdom,
        cityId: ids.otherCity,
      }),
    ],
    relationships: [],
    events: [],
  };
}

function issueCodes(input: WorldAuditInput) {
  return auditWorld(input).map((issue) => issue.code);
}

describe("auditWorld kingdom consistency errors", () => {
  it("accepts a capital city belonging to its kingdom", () => {
    const input = makeInput();
    input.kingdoms[0]!.capitalCityId = ids.city;
    expect(issueCodes(input)).not.toContain("invalid_kingdom_capital");
  });

  it("reports a capital city assigned from another kingdom", () => {
    const input = makeInput();
    input.kingdoms[0]!.capitalCityId = ids.otherCity;
    expect(issueCodes(input)).toContain("invalid_kingdom_capital");
  });

  it("accepts an acyclic parent relationship graph", () => {
    const input = makeInput();
    input.relationships.push(
      makeRelationship(ids.character, ids.otherCharacter, "parent")
    );
    expect(issueCodes(input)).not.toContain("ancestor_cycle");
  });

  it("reports a character who is their own ancestor", () => {
    const input = makeInput();
    input.relationships.push(
      makeRelationship(ids.character, ids.otherCharacter, "parent"),
      makeRelationship(ids.otherCharacter, ids.character, "parent")
    );
    expect(issueCodes(input)).toContain("ancestor_cycle");
  });

  it("accepts a kingdom pair with only one active diplomatic status", () => {
    const input = makeInput();
    input.relationships.push(
      makeRelationship(
        ids.kingdom,
        ids.otherKingdom,
        "at_war_with",
        "kingdom",
        "kingdom"
      )
    );
    expect(issueCodes(input)).not.toContain("conflicting_kingdom_relations");
  });

  it("reports a kingdom pair that is both allied and at war", () => {
    const input = makeInput();
    input.relationships.push(
      makeRelationship(
        ids.kingdom,
        ids.otherKingdom,
        "at_war_with",
        "kingdom",
        "kingdom"
      ),
      makeRelationship(
        ids.otherKingdom,
        ids.kingdom,
        "allied_with",
        "kingdom",
        "kingdom"
      )
    );
    expect(issueCodes(input)).toContain("conflicting_kingdom_relations");
  });

  it("accepts relationships whose endpoints are active entities", () => {
    const input = makeInput();
    input.relationships.push(
      makeRelationship(ids.character, ids.otherCharacter, "friend")
    );
    expect(issueCodes(input)).not.toContain("relationship_missing_entity");
  });

  it("reports a relationship referencing a missing or deleted entity", () => {
    const input = makeInput();
    input.characters.push(
      makeCharacter("deleted-character", "Former", { isDeleted: true })
    );
    input.relationships.push(
      makeRelationship(ids.character, "deleted-character", "friend")
    );
    expect(issueCodes(input)).toContain("relationship_missing_entity");
  });
});

describe("auditWorld consistency warnings", () => {
  it("accepts a living kingdom ruler", () => {
    const input = makeInput();
    input.kingdoms[0]!.rulerId = ids.character;
    expect(issueCodes(input)).not.toContain("deceased_kingdom_ruler");
  });

  it("warns when a kingdom's ruler is marked deceased", () => {
    const input = makeInput();
    input.kingdoms[0]!.rulerId = ids.character;
    input.characters[0]!.isAlive = false;
    expect(issueCodes(input)).toContain("deceased_kingdom_ruler");
  });

  it("accepts a ruler assigned to the kingdom they rule", () => {
    const input = makeInput();
    input.kingdoms[0]!.rulerId = ids.character;
    expect(issueCodes(input)).not.toContain("ruler_kingdom_mismatch");
  });

  it("warns when the ruler is assigned to a different kingdom", () => {
    const input = makeInput();
    input.kingdoms[0]!.rulerId = ids.otherCharacter;
    expect(issueCodes(input)).toContain("ruler_kingdom_mismatch");
  });

  it("accepts a character city within their assigned kingdom", () => {
    const input = makeInput();
    expect(issueCodes(input)).not.toContain(
      "character_city_kingdom_mismatch"
    );
  });

  it("warns when a character's city is outside their assigned kingdom", () => {
    const input = makeInput();
    input.characters[0]!.kingdomId = ids.otherKingdom;
    expect(issueCodes(input)).toContain("character_city_kingdom_mismatch");
  });

  it("accepts a parent at least 12 years older than their child", () => {
    const input = makeInput();
    input.characters[0]!.age = 40;
    input.characters[1]!.age = 20;
    input.relationships.push(
      makeRelationship(ids.character, ids.otherCharacter, "parent")
    );
    expect(issueCodes(input)).not.toContain("parent_age_gap");
  });

  it("warns when a living parent is less than 12 years older", () => {
    const input = makeInput();
    input.characters[0]!.age = 30;
    input.characters[1]!.age = 25;
    input.relationships.push(
      makeRelationship(ids.character, ids.otherCharacter, "parent")
    );
    expect(issueCodes(input)).toContain("parent_age_gap");
  });

  it("does not compare parent ages when either character is deceased", () => {
    const input = makeInput();
    input.characters[0]!.age = 30;
    input.characters[0]!.isAlive = false;
    input.characters[1]!.age = 25;
    input.relationships.push(
      makeRelationship(ids.character, ids.otherCharacter, "parent")
    );
    expect(issueCodes(input)).not.toContain("parent_age_gap");
  });

  it("accepts names that are unique within each entity type", () => {
    const input = makeInput();
    expect(issueCodes(input)).not.toContain("duplicate_entity_name");
  });

  it("warns on duplicate names ignoring case and surrounding spaces", () => {
    const input = makeInput();
    input.characters[1]!.name = "  alaria ";
    expect(issueCodes(input)).toContain("duplicate_entity_name");
  });

  it("accepts a death event for a character marked deceased", () => {
    const input = makeInput();
    input.characters[0]!.isAlive = false;
    input.events.push(makeEvent("death-1", 90, "death", [ids.character]));
    expect(issueCodes(input)).not.toContain("alive_after_death_event");
  });

  it("warns when a character with a death event is marked alive", () => {
    const input = makeInput();
    input.events.push(makeEvent("death-1", 90, "death", [ids.character]));
    expect(issueCodes(input)).toContain("alive_after_death_event");
  });

  it("accepts only succession or death events after a death event", () => {
    const input = makeInput();
    input.events.push(
      makeEvent("death-1", 80, "death", [ids.character]),
      makeEvent("death-2", 90, "death", [ids.character]),
      makeEvent("succession-1", 90, "succession", [ids.character])
    );
    expect(issueCodes(input)).not.toContain("event_after_character_death");
  });

  it("warns when a character is linked to an ordinary event after death", () => {
    const input = makeInput();
    input.events.push(
      makeEvent("death-1", 80, "death", [ids.character]),
      makeEvent("war-1", 90, "war", [ids.character])
    );
    expect(issueCodes(input)).toContain("event_after_character_death");
  });
});

describe("auditWorld informational findings", () => {
  it("does not report a living character without a death event", () => {
    const input = makeInput();
    input.characters[0]!.isAlive = true;
    expect(issueCodes(input)).not.toContain("missing_death_event");
  });

  it("reports a deceased character without a death event", () => {
    const input = makeInput();
    input.characters[0]!.isAlive = false;
    expect(issueCodes(input)).toContain("missing_death_event");
  });

  it("accepts events dated on or before the world's current year", () => {
    const input = makeInput();
    input.events.push(makeEvent("event-1", 100, "other"));
    expect(issueCodes(input)).not.toContain("event_after_current_year");
  });

  it("reports events dated after the world's current year", () => {
    const input = makeInput();
    input.events.push(makeEvent("event-1", 101, "other"));
    expect(issueCodes(input)).toContain("event_after_current_year");
  });
});
