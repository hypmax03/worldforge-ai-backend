import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose, { type Types } from "mongoose";
import { Character } from "../models/Character.js";
import { City } from "../models/City.js";
import { Event, eventCategories, type EventCategory } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import {
  Relationship,
  type RelationshipEntityType,
  type RelationshipType,
} from "../models/Relationship.js";
import { User } from "../models/User.js";
import { World } from "../models/World.js";

const DEMO_WORLD_NAME = "Elarion";
const relationMatrix: Record<
  `${RelationshipEntityType}:${RelationshipEntityType}`,
  readonly RelationshipType[]
> = {
  "character:character": [
    "parent",
    "spouse",
    "sibling",
    "friend",
    "enemy",
    "rival",
    "mentor",
    "serves",
  ],
  "kingdom:kingdom": ["at_war_with", "allied_with", "trade_partner"],
  "character:kingdom": ["serves", "ally", "enemy"],
  "kingdom:character": [],
};

type EntityRef = { type: RelationshipEntityType; id: Types.ObjectId };
type RelationshipSeed = {
  from: EntityRef;
  to: EntityRef;
  type: RelationshipType;
  notes?: string;
};

function validateCredentials(email: string, password: string) {
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error("SEED_DEMO_EMAIL must be a valid email address.");
  }
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (passwordBytes < 8 || passwordBytes > 72) {
    throw new Error("SEED_DEMO_PASSWORD must be between 8 and 72 UTF-8 bytes.");
  }
}

function validateRelationshipSeeds(
  relationships: RelationshipSeed[],
  characterIds: Set<string>,
  kingdomIds: Set<string>
) {
  const seen = new Set<string>();
  for (const relationship of relationships) {
    const { from, to, type } = relationship;
    const fromIds = from.type === "character" ? characterIds : kingdomIds;
    const toIds = to.type === "character" ? characterIds : kingdomIds;
    if (
      from.id.equals(to.id) ||
      !fromIds.has(from.id.toString()) ||
      !toIds.has(to.id.toString()) ||
      !relationMatrix[`${from.type}:${to.type}`].includes(type)
    ) {
      throw new Error(`Invalid seeded relationship: ${type}`);
    }
    const key = `${from.id}:${to.id}:${type}`;
    if (seen.has(key)) throw new Error(`Duplicate seeded relationship: ${type}`);
    seen.add(key);
  }
}

function validateEventSeeds(
  eventSeeds: {
    category: EventCategory;
    characterIds?: Types.ObjectId[];
    kingdomIds?: Types.ObjectId[];
    cityIds?: Types.ObjectId[];
  }[],
  validCharacterIds: Set<string>,
  validKingdomIds: Set<string>,
  validCityIds: Set<string>
) {
  for (const event of eventSeeds) {
    if (!eventCategories.includes(event.category)) {
      throw new Error(`Invalid seeded event category: ${event.category}`);
    }
    for (const [ids, validIds, entityType] of [
      [event.characterIds ?? [], validCharacterIds, "character"],
      [event.kingdomIds ?? [], validKingdomIds, "kingdom"],
      [event.cityIds ?? [], validCityIds, "city"],
    ] as const) {
      if (ids.some((id) => !validIds.has(id.toString()))) {
        throw new Error(`A seeded event references an invalid ${entityType}.`);
      }
    }
  }
}

function validateMapPosition(x: number, y: number) {
  for (const coordinate of [x, y]) {
    if (!Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1000) {
      throw new Error("Seed map coordinates must be finite values from 0 to 1000.");
    }
  }
}

async function removePreviousDemoWorlds(ownerId: Types.ObjectId) {
  const worlds = await World.find({ ownerId, name: DEMO_WORLD_NAME }).select("_id");
  if (worlds.length === 0) return;

  const worldIds = worlds.map((world) => world._id);
  const scope = { ownerId, worldId: { $in: worldIds } };
  await Promise.all([
    Relationship.deleteMany(scope),
    Event.deleteMany(scope),
    Character.deleteMany(scope),
    City.deleteMany(scope),
    Kingdom.deleteMany(scope),
  ]);
  await World.deleteMany({ _id: { $in: worldIds }, ownerId });
}

async function seedDemoWorld(ownerId: Types.ObjectId) {
  const world = await World.create({
    ownerId,
    name: DEMO_WORLD_NAME,
    genre: "fantasy",
    currentYear: 154,
    description: "A storied realm of old kingdoms, shifting alliances, and hard-won peace.",
    technologyLevel: "Late medieval",
    magicLevel: "Low",
    historicalStartingPoint: "The founding of Eldoria",
  });

  const [eldoria, ashvale, larkspur] = await Kingdom.create([
    {
      worldId: world._id,
      ownerId,
      name: "Eldoria",
      government: "Monarchy",
      population: 820000,
      mapX: 430,
      mapY: 380,
      stability: 68,
    },
    {
      worldId: world._id,
      ownerId,
      name: "Ashvale",
      government: "Council of Lords",
      population: 510000,
      mapX: 730,
      mapY: 620,
      stability: 54,
    },
    {
      worldId: world._id,
      ownerId,
      name: "Larkspur",
      government: "Ducal Principality",
      population: 94000,
      mapX: 170,
      mapY: 690,
      stability: 81,
    },
  ]);

  if (!eldoria || !ashvale || !larkspur) {
    throw new Error("Failed to create all demo kingdoms.");
  }

  const [valen, portMerrow, highwatch, ashvaleCity] = await City.create([
    {
      worldId: world._id,
      kingdomId: eldoria._id,
      ownerId,
      name: "Valen",
      population: 145000,
      government: "Royal charter",
      mapX: 450,
      mapY: 410,
    },
    {
      worldId: world._id,
      kingdomId: eldoria._id,
      ownerId,
      name: "Port Merrow",
      population: 72000,
      government: "Merchant council",
      mapX: 260,
      mapY: 540,
    },
    {
      worldId: world._id,
      kingdomId: eldoria._id,
      ownerId,
      name: "Highwatch",
      population: 38000,
      government: "Warden command",
      mapX: 610,
      mapY: 250,
    },
    {
      worldId: world._id,
      kingdomId: ashvale._id,
      ownerId,
      name: "Ashvale City",
      population: 97000,
      government: "Council seat",
      mapX: 760,
      mapY: 590,
    },
  ]);

  if (!valen || !portMerrow || !highwatch || !ashvaleCity) {
    throw new Error("Failed to create all demo cities.");
  }

  const characters = await Character.create([
    {
      worldId: world._id,
      ownerId,
      name: "King Arthas",
      age: 60,
      gender: "Male",
      race: "Human",
      occupation: "Former king",
      isAlive: false,
      kingdomId: eldoria._id,
      cityId: valen._id,
      biography: "A measured monarch whose reign secured Eldoria's borders and its old alliances.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Prince Kael",
      age: 24,
      gender: "Male",
      race: "Human",
      occupation: "King",
      isAlive: true,
      kingdomId: eldoria._id,
      cityId: valen._id,
      biography: "Heir to Eldoria, now king after the death of his father.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Lord Varik",
      age: 46,
      gender: "Male",
      race: "Human",
      occupation: "Lord and military strategist",
      isAlive: true,
      kingdomId: ashvale._id,
      cityId: ashvaleCity._id,
      biography: "A powerful Ashvale lord and a persistent rival of Kael.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Queen Mira",
      age: 58,
      gender: "Female",
      race: "Human",
      occupation: "Queen mother",
      isAlive: true,
      kingdomId: eldoria._id,
      cityId: valen._id,
      biography: "A respected diplomat who continues to advise the royal court.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Captain Elara Venn",
      age: 38,
      gender: "Female",
      race: "Human",
      occupation: "Captain of the Highwatch guard",
      isAlive: true,
      kingdomId: eldoria._id,
      cityId: highwatch._id,
      biography: "A veteran commander charged with protecting Eldoria's northern passes.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Tovin Reed",
      age: 52,
      gender: "Male",
      race: "Human",
      occupation: "Royal archivist",
      isAlive: true,
      kingdomId: eldoria._id,
      cityId: valen._id,
      biography: "Keeper of the royal archives and an expert on Eldoria's founding.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Nia Seabright",
      age: 27,
      gender: "Female",
      race: "Human",
      occupation: "Navigator",
      isAlive: true,
      kingdomId: eldoria._id,
      cityId: portMerrow._id,
      biography: "A celebrated navigator whose routes keep Port Merrow connected to the coast.",
    },
    {
      worldId: world._id,
      ownerId,
      name: "Bram Alder",
      age: 44,
      gender: "Male",
      race: "Human",
      occupation: "Physician",
      isAlive: true,
      kingdomId: ashvale._id,
      cityId: ashvaleCity._id,
      biography: "A physician known for treating commoners and nobles alike.",
    },
  ]);

  if (characters.length !== 8) throw new Error("Failed to create all demo characters.");
  const [arthas, kael, varik, mira] = characters;
  if (!arthas || !kael || !varik || !mira) {
    throw new Error("Failed to resolve the main demo characters.");
  }

  const capitalIsValid = valen.kingdomId.equals(eldoria._id);
  const rulerIsValid =
    kael.isAlive && kael.kingdomId?.equals(eldoria._id) && kael.worldId.equals(world._id);
  if (!capitalIsValid || !rulerIsValid) {
    throw new Error("The seeded ruler or capital does not belong to Eldoria.");
  }

  await Kingdom.updateOne(
    { _id: eldoria._id, ownerId, worldId: world._id },
    { $set: { rulerId: kael._id, capitalCityId: valen._id } },
    { runValidators: true }
  );

  const relationshipSeeds: RelationshipSeed[] = [
    { from: { type: "character", id: arthas._id }, to: { type: "character", id: kael._id }, type: "parent" },
    { from: { type: "character", id: arthas._id }, to: { type: "character", id: mira._id }, type: "spouse" },
    { from: { type: "character", id: kael._id }, to: { type: "character", id: varik._id }, type: "enemy" },
    { from: { type: "character", id: varik._id }, to: { type: "kingdom", id: ashvale._id }, type: "serves" },
    {
      from: { type: "kingdom", id: eldoria._id },
      to: { type: "kingdom", id: ashvale._id },
      type: "at_war_with",
      notes: "The kingdoms remain rivals following the border war.",
    },
    { from: { type: "kingdom", id: eldoria._id }, to: { type: "kingdom", id: larkspur._id }, type: "allied_with" },
  ];
  const characterIds = new Set(characters.map(({ _id }) => _id.toString()));
  const kingdomIds = new Set(
    [eldoria, ashvale, larkspur].map(({ _id }) => _id.toString())
  );
  validateRelationshipSeeds(relationshipSeeds, characterIds, kingdomIds);
  await Relationship.create(
    relationshipSeeds.map(({ from, to, type, notes }) => ({
      worldId: world._id,
      ownerId,
      fromType: from.type,
      fromId: from.id,
      toType: to.type,
      toId: to.id,
      type,
      ...(notes ? { notes } : {}),
    }))
  );

  const eventSeeds: {
    year: number;
    title: string;
    description: string;
    category: EventCategory;
    characterIds?: Types.ObjectId[];
    kingdomIds?: Types.ObjectId[];
    cityIds?: Types.ObjectId[];
  }[] = [
    {
      year: 100,
      title: "Eldoria is founded",
      description: "The first crown unites the river settlements and establishes Eldoria.",
      category: "founding",
      kingdomIds: [eldoria._id],
      cityIds: [valen._id],
    },
    {
      year: 145,
      title: "War with Ashvale begins",
      description: "A dispute over the eastern marches draws Eldoria and Ashvale into open conflict.",
      category: "war",
      kingdomIds: [eldoria._id, ashvale._id],
    },
    {
      year: 151,
      title: "King Arthas dies",
      description: "King Arthas dies in Valen after a long reign.",
      category: "death",
      characterIds: [arthas._id],
      kingdomIds: [eldoria._id],
      cityIds: [valen._id],
    },
    {
      year: 151,
      title: "Kael becomes king",
      description: "Following Arthas's death, Prince Kael is crowned king of Eldoria.",
      category: "succession",
      characterIds: [kael._id],
      kingdomIds: [eldoria._id],
      cityIds: [valen._id],
    },
    {
      year: 153,
      title: "The Great Drought begins",
      description: "Rain fails across the central plains, threatening harvests and trade.",
      category: "disaster",
      kingdomIds: [eldoria._id, ashvale._id],
      cityIds: [valen._id, ashvaleCity._id],
    },
    {
      year: 154,
      title: "Civil unrest begins",
      description: "Food shortages and rising taxes spark unrest in Eldoria's cities.",
      category: "other",
      kingdomIds: [eldoria._id],
      cityIds: [valen._id, portMerrow._id],
      characterIds: [kael._id, mira._id],
    },
  ];

  validateEventSeeds(
    eventSeeds,
    characterIds,
    kingdomIds,
    new Set([valen, portMerrow, highwatch, ashvaleCity].map(({ _id }) => _id.toString()))
  );
  const firstCreatedAt = Date.now() - eventSeeds.length * 1000;
  for (const [index, { year, title, description, category, ...links }] of eventSeeds.entries()) {
    const createdAt = new Date(firstCreatedAt + index * 1000);
    await Event.create({
      worldId: world._id,
      ownerId,
      year,
      title,
      description,
      category,
      source: "manual",
      createdAt,
      updatedAt: createdAt,
      ...links,
    });
  }

  for (const kingdom of [eldoria, ashvale, larkspur]) {
    validateMapPosition(kingdom.mapX!, kingdom.mapY!);
  }
  for (const city of [valen, portMerrow, highwatch, ashvaleCity]) {
    validateMapPosition(city.mapX!, city.mapY!);
  }

  return {
    world,
    kingdomCount: 3,
    cityCount: 4,
    characterCount: characters.length,
    relationshipCount: relationshipSeeds.length,
    eventCount: eventSeeds.length,
  };
}

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to seed in production without the --force flag.");
  }

  const email = (process.env.SEED_DEMO_EMAIL ?? "demo@worldforge.dev").trim().toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) throw new Error("SEED_DEMO_PASSWORD is required.");
  validateCredentials(email, password);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required.");

  await mongoose.connect(mongoUri);
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOne({ email });
    const demoUser =
      user ??
      new User({
        email,
        passwordHash,
      });
    demoUser.passwordHash = passwordHash;
    await demoUser.save();

    await removePreviousDemoWorlds(demoUser._id);
    const summary = await seedDemoWorld(demoUser._id);
    console.log(
      `Seeded ${summary.world.name} for ${demoUser.email}: ` +
        `${summary.kingdomCount} kingdoms, ${summary.cityCount} cities, ` +
        `${summary.characterCount} characters, ${summary.relationshipCount} relationships, ` +
        `${summary.eventCount} events.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Demo seed failed:", error);
  process.exitCode = 1;
});
