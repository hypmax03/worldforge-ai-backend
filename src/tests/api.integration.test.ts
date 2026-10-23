import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import app from "../app.js";
import { Character } from "../models/Character.js";
import { City } from "../models/City.js";
import { Event } from "../models/Event.js";
import { Kingdom } from "../models/Kingdom.js";
import { Relationship } from "../models/Relationship.js";
import { World } from "../models/World.js";
import {
  createCharacter,
  createCity,
  createEvent,
  createKingdom,
  createRelationship,
  createUserAgent,
  createWorld,
  registerAgent,
  type TestAgent,
} from "./helpers.js";

vi.mock("../services/aiService.js", () => ({
  generateStructured: vi.fn(async ({ schema }: { schema: { parse(value: unknown): unknown } }) =>
    schema.parse({ issues: [] })
  ),
}));

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 600_000);

afterEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  if (collections?.length) {
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

let nextEmail = 1;
async function userAgent(label = "api") {
  return createUserAgent(`${label}-${nextEmail++}@example.test`);
}

describe("authentication API", () => {
  it("registers, rejects duplicate registration, logs in, rejects passwords, reads me, and logs out", async () => {
    const email = `auth-${nextEmail++}@example.test`;
    const password = "secure-password";
    const { agent, user, response: registerResponse } = await registerAgent(email, password);
    expect(user.email).toBe(email);
    expect(user.id).toBeTruthy();
    expect(registerResponse.headers["set-cookie"]?.toString()).toContain("HttpOnly");
    const registration = await agent.post("/api/auth/register").send({ email, password });
    expect(registration.status).toBe(409);
    expect(registration.body).not.toHaveProperty("token");

    const loggedIn = supertest.agent(app);
    const loginResponse = await loggedIn.post("/api/auth/login").send({ email, password });
    expect(loginResponse.status).toBe(200);
    const setCookie = String(loginResponse.headers["set-cookie"]);
    expect(setCookie).toContain("wf_token=");
    expect(setCookie).toContain("HttpOnly");
    expect(loginResponse.body).not.toHaveProperty("token");
    expect((await loggedIn.get("/api/auth/me")).status).toBe(200);
    expect((await supertest(app).get("/api/auth/me")).status).toBe(401);
    const wrongPassword = await supertest(app)
      .post("/api/auth/login")
      .send({ email, password: "incorrect-password" });
    expect(wrongPassword.status).toBe(401);

    const logout = await loggedIn.post("/api/auth/logout");
    expect(logout.status).toBe(200);
    expect(String(logout.headers["set-cookie"])).toContain("wf_token=;");
    expect((await loggedIn.get("/api/auth/me")).status).toBe(401);
  });

  it("rejects NoSQL-injection bodies, invalid passwords, and malformed ids", async () => {
    const { agent } = await userAgent("auth-validation");
    expect((await agent.post("/api/auth/login").send({
      email: "someone@example.test",
      password: { $gt: "" },
    })).status).toBe(400);
    expect((await agent.post("/api/auth/register").send({
      email: "short@example.test",
      password: "short",
    })).status).toBe(400);
    expect((await agent.post("/api/auth/register").send({
      email: "nonstring@example.test",
      password: 12345678,
    })).status).toBe(400);
    expect((await agent.get("/api/worlds/not-an-object-id")).status).toBe(400);
  });
});

describe("ownership isolation and update whitelists", () => {
  it("blocks foreign entity reads, nested creation, relationship linking, and ruler assignment", async () => {
    const owner = await userAgent("owner");
    const other = await userAgent("other");
    const world = await createWorld(owner.agent, "Private World");
    const kingdom = await createKingdom(owner.agent, String(world._id), "Private Kingdom");
    const city = await createCity(owner.agent, String(kingdom._id), "Private City");
    const character = await createCharacter(owner.agent, String(world._id), "Private Character");
    const secondCharacter = await createCharacter(
      owner.agent,
      String(world._id),
      "Second Character"
    );
    const relationship = await createRelationship(
      owner.agent,
      String(world._id),
      { type: "character", id: String(character._id) },
      { type: "character", id: String(secondCharacter._id) },
      "friend"
    );
    const event = await createEvent(String(world._id), owner.user.id);
    const exported = await owner.agent.get(`/api/worlds/${world._id}/export`).expect(200);
    expect(exported.headers["content-disposition"]).toContain("private-world.json");
    expect(exported.body.world).not.toHaveProperty("ownerId");
    expect(exported.body.world).not.toHaveProperty("__v");
    expect(exported.body.events).toHaveLength(1);

    const otherWorld = await createWorld(other.agent, "Other World");
    const otherKingdom = await createKingdom(
      other.agent,
      String(otherWorld._id),
      "Other Kingdom"
    );
    const root = `/api/worlds/${world._id}`;
    for (const path of [
      `/api/worlds/${world._id}`,
      `/api/kingdoms/${kingdom._id}`,
      `/api/cities/${city._id}`,
      `/api/characters/${character._id}`,
      `/api/events/${event._id}`,
      `/api/relationships/${relationship._id}`,
    ]) {
      expect((await other.agent.get(path)).status).toBe(404);
    }
    expect((await other.agent.get(`${root}/kingdoms`)).status).toBe(404);
    expect((await other.agent.get(`${root}/characters`)).status).toBe(404);
    expect((await other.agent.get(`${root}/relationships`)).status).toBe(404);
    expect((await other.agent.get(`/api/kingdoms/${kingdom._id}/cities`)).status).toBe(404);
    expect((await other.agent.get(`/api/worlds/${world._id}/export`)).status).toBe(404);
    expect((await other.agent.delete(`/api/relationships/${relationship._id}`)).status).toBe(404);
    expect((await other.agent.post(`${root}/kingdoms`).send({ name: "Intruder" })).status).toBe(404);
    expect((await other.agent.post(`${root}/characters`).send({ name: "Intruder" })).status).toBe(404);
    expect((await other.agent.post(`/api/kingdoms/${kingdom._id}/cities`)
      .send({ name: "Intruder" })).status).toBe(404);
    expect((await other.agent.post(`/api/worlds/${world._id}/relationships`).send({
      fromType: "character",
      fromId: character._id,
      toType: "character",
      toId: secondCharacter._id,
      type: "friend",
    })).status).toBe(404);
    const rulerResponse = await other.agent.put(`/api/kingdoms/${otherKingdom._id}`)
      .send({ rulerId: String(character._id) });
    expect(rulerResponse.status).toBe(400);
    expect(rulerResponse.body.message).toBe("Invalid ruler");
  });

  it("ignores ownerId, worldId, and isDeleted in update payloads", async () => {
    const owner = await userAgent("whitelist");
    const other = await userAgent("whitelist-other");
    const world = await createWorld(owner.agent);
    const kingdom = await createKingdom(owner.agent, String(world._id));
    const city = await createCity(owner.agent, String(kingdom._id));
    const character = await createCharacter(owner.agent, String(world._id));

    await owner.agent.put(`/api/worlds/${world._id}`).send({
      name: "Updated World",
      ownerId: other.user.id,
      isDeleted: true,
    }).expect(200);
    await owner.agent.put(`/api/kingdoms/${kingdom._id}`).send({
      name: "Updated Kingdom",
      worldId: String((await createWorld(other.agent))._id),
      ownerId: other.user.id,
      isDeleted: true,
    }).expect(200);
    await owner.agent.put(`/api/cities/${city._id}`).send({
      name: "Updated City",
      ownerId: other.user.id,
      isDeleted: true,
    }).expect(200);
    await owner.agent.put(`/api/characters/${character._id}`).send({
      name: "Updated Character",
      ownerId: other.user.id,
      worldId: String((await createWorld(other.agent))._id),
      isDeleted: true,
    }).expect(200);

    expect(String((await World.findById(world._id))?.ownerId)).toBe(owner.user.id);
    expect((await World.findById(world._id))?.isDeleted).toBe(false);
    expect(String((await Kingdom.findById(kingdom._id))?.worldId)).toBe(String(world._id));
    expect((await Kingdom.findById(kingdom._id))?.isDeleted).toBe(false);
    expect(String((await City.findById(city._id))?.ownerId)).toBe(owner.user.id);
    expect((await City.findById(city._id))?.isDeleted).toBe(false);
    expect(String((await Character.findById(character._id))?.worldId)).toBe(String(world._id));
    expect((await Character.findById(character._id))?.isDeleted).toBe(false);
  });
});

describe("relationship rules", () => {
  it("accepts the allowed type matrix and rejects invalid pairs, duplicates, and self-links", async () => {
    const { agent } = await userAgent("relationships");
    const world = await createWorld(agent);
    const c1 = await createCharacter(agent, String(world._id), "One");
    const c2 = await createCharacter(agent, String(world._id), "Two");
    const c3 = await createCharacter(agent, String(world._id), "Three");
    const k1 = await createKingdom(agent, String(world._id), "One Kingdom");
    const k2 = await createKingdom(agent, String(world._id), "Two Kingdom");
    const charTypes = ["parent", "spouse", "sibling", "friend", "enemy", "rival", "mentor", "serves"];
    for (const type of charTypes) {
      await createRelationship(
        agent,
        String(world._id),
        { type: "character", id: String(c1._id) },
        { type: "character", id: String(c2._id) },
        type
      );
    }
    for (const type of ["at_war_with", "allied_with", "trade_partner"]) {
      await createRelationship(
        agent,
        String(world._id),
        { type: "kingdom", id: String(k1._id) },
        { type: "kingdom", id: String(k2._id) },
        type
      );
    }
    for (const type of ["serves", "ally", "enemy"]) {
      await createRelationship(
        agent,
        String(world._id),
        { type: "character", id: String(c3._id) },
        { type: "kingdom", id: String(k1._id) },
        type
      );
    }

    const relationshipsPath = `/api/worlds/${world._id}/relationships`;
    const invalidMatrix = [
      ...["at_war_with", "allied_with", "trade_partner"].map((type) => ({
        fromType: "character", fromId: String(c1._id),
        toType: "character", toId: String(c2._id), type,
      })),
      ...["parent", "spouse", "sibling", "friend", "enemy", "ally", "rival", "mentor", "serves"].map((type) => ({
        fromType: "kingdom", fromId: String(k1._id),
        toType: "kingdom", toId: String(k2._id), type,
      })),
      ...["parent", "spouse", "sibling", "friend", "rival", "mentor", "at_war_with", "allied_with", "trade_partner"].map((type) => ({
        fromType: "character", fromId: String(c1._id),
        toType: "kingdom", toId: String(k1._id), type,
      })),
      ...["parent", "spouse", "sibling", "friend", "enemy", "ally", "rival", "mentor", "serves", "at_war_with", "allied_with", "trade_partner"].map((type) => ({
        fromType: "kingdom", fromId: String(k1._id),
        toType: "character", toId: String(c1._id), type,
      })),
      {
        fromType: "character", fromId: String(c1._id),
        toType: "character", toId: String(c2._id), type: "unknown",
      },
    ];
    for (const payload of invalidMatrix) {
      expect((await agent.post(relationshipsPath).send(payload)).status).toBe(400);
    }
    const self = await agent.post(relationshipsPath).send({
      fromType: "character",
      fromId: String(c1._id),
      toType: "character",
      toId: String(c1._id),
      type: "friend",
    });
    expect(self.status).toBe(400);
    expect((await agent.post(relationshipsPath).send({
      fromType: "character",
      fromId: String(c1._id),
      toType: "character",
      toId: String(c2._id),
      type: "friend",
    })).status).toBe(409);
  });
});

describe("kingdom rulers and capitals", () => {
  it("validates references, allows clearing them, and clears them on soft delete", async () => {
    const { agent } = await userAgent("ruler-capital");
    const world = await createWorld(agent);
    const kingdom = await createKingdom(agent, String(world._id));
    const otherKingdom = await createKingdom(agent, String(world._id), "Other Kingdom");
    const character = await createCharacter(agent, String(world._id));
    const otherCharacter = await createCharacter(agent, String(world._id), "Other Ruler");
    const city = await createCity(agent, String(kingdom._id));
    const unrelatedCity = await createCity(agent, String(otherKingdom._id), "Other City");

    expect((await agent.put(`/api/kingdoms/${kingdom._id}`)
      .send({ rulerId: "bad-id" })).status).toBe(400);
    expect((await agent.put(`/api/kingdoms/${kingdom._id}`)
      .send({ capitalCityId: String(unrelatedCity._id) })).status).toBe(400);
    await agent.put(`/api/kingdoms/${kingdom._id}`).send({
      rulerId: String(character._id),
      capitalCityId: String(city._id),
    }).expect(200);
    await agent.delete(`/api/characters/${character._id}`).expect(200);
    expect((await Kingdom.findById(kingdom._id))?.rulerId).toBeNull();
    await agent.put(`/api/kingdoms/${kingdom._id}`).send({
      rulerId: String(otherCharacter._id),
      capitalCityId: String(city._id),
    }).expect(200);
    await agent.delete(`/api/cities/${city._id}`).expect(200);
    expect((await Kingdom.findById(kingdom._id))?.capitalCityId).toBeNull();
  });
});

describe("soft delete, trash, and restore", () => {
  it("cascades deletions, lists directly deleted entities, and restores a world and children", async () => {
    const { agent, user } = await userAgent("world-trash");
    const world = await createWorld(agent);
    const kingdom = await createKingdom(agent, String(world._id));
    const city = await createCity(agent, String(kingdom._id));
    const character = await createCharacter(agent, String(world._id));
    const otherCharacter = await createCharacter(agent, String(world._id), "Other Character");
    const relationship = await createRelationship(
      agent,
      String(world._id),
      { type: "character", id: String(character._id) },
      { type: "character", id: String(otherCharacter._id) },
      "friend"
    );
    const event = await createEvent(String(world._id), user.id);

    await agent.delete(`/api/kingdoms/${kingdom._id}`).expect(200);
    await agent.delete(`/api/worlds/${world._id}`).expect(200);
    expect((await Kingdom.findById(kingdom._id))?.deletedWith).toBeNull();
    expect((await City.findById(city._id))?.deletedWith?.toString()).toBe(String(kingdom._id));
    expect((await Character.findById(character._id))?.deletedWith?.toString()).toBe(String(world._id));
    expect((await Relationship.findById(relationship._id))?.deletedWith?.toString()).toBe(String(world._id));
    expect((await Event.findById(event._id))?.deletedWith?.toString()).toBe(String(world._id));
    expect((await agent.post(`/api/trash/kingdoms/${kingdom._id}/restore`)).status).toBe(409);
    const deletedWorlds = await agent.get("/api/trash/worlds").expect(200);
    expect(deletedWorlds.body.worlds).toEqual([
      expect.objectContaining({ id: String(world._id), name: world.name }),
    ]);
    await agent.post(`/api/trash/worlds/${world._id}/restore`).expect(200);
    expect((await World.findById(world._id))?.isDeleted).toBe(false);
    expect((await Kingdom.findById(kingdom._id))?.isDeleted).toBe(true);
    await agent.post(`/api/trash/kingdoms/${kingdom._id}/restore`).expect(200);
    expect((await Kingdom.findById(kingdom._id))?.isDeleted).toBe(false);
    expect((await City.findById(city._id))?.isDeleted).toBe(false);
    expect((await Character.findById(character._id))?.isDeleted).toBe(false);
    expect((await Event.findById(event._id))?.isDeleted).toBe(false);
    expect((await Relationship.findById(relationship._id))?.isDeleted).toBe(false);
  });

  it("lists grouped direct deletes, restores kingdom cascades, and skips relations with deleted endpoints", async () => {
    const { agent, user } = await userAgent("entity-trash");
    const world = await createWorld(agent);
    const kingdom = await createKingdom(agent, String(world._id));
    const otherKingdom = await createKingdom(agent, String(world._id), "Ally Kingdom");
    const city = await createCity(agent, String(kingdom._id));
    const character = await createCharacter(agent, String(world._id), "Character A");
    const otherCharacter = await createCharacter(agent, String(world._id), "Character B");
    const kingdomRelation = await createRelationship(
      agent,
      String(world._id),
      { type: "kingdom", id: String(kingdom._id) },
      { type: "kingdom", id: String(otherKingdom._id) },
      "allied_with"
    );

    await agent.delete(`/api/kingdoms/${kingdom._id}`).expect(200);
    const event = await createEvent(String(world._id), user.id);
    await Event.updateOne(
      { _id: event._id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedWith: null } }
    );
    const trash = await agent.get(`/api/worlds/${world._id}/trash`).expect(200);
    expect(trash.body).toEqual({
      kingdoms: [expect.objectContaining({ id: String(kingdom._id), name: kingdom.name })],
      cities: [],
      characters: [],
      events: [expect.objectContaining({ id: String(event._id), title: event.title })],
    });
    await agent.post(`/api/trash/kingdoms/${kingdom._id}/restore`).expect(200);
    expect((await City.findById(city._id))?.isDeleted).toBe(false);
    expect((await Relationship.findById(kingdomRelation._id))?.isDeleted).toBe(false);
    await agent.post(`/api/trash/events/${event._id}/restore`).expect(200);
    expect((await Event.findById(event._id))?.isDeleted).toBe(false);

    const characterRelation = await createRelationship(
      agent,
      String(world._id),
      { type: "character", id: String(character._id) },
      { type: "character", id: String(otherCharacter._id) },
      "friend"
    );
    await agent.delete(`/api/characters/${character._id}`).expect(200);
    await agent.delete(`/api/characters/${otherCharacter._id}`).expect(200);
    await agent.post(`/api/trash/characters/${character._id}/restore`).expect(200);
    expect((await Relationship.findById(characterRelation._id))?.isDeleted).toBe(true);
    expect((await Character.findById(character._id))?.isDeleted).toBe(false);
    expect((await Character.findById(otherCharacter._id))?.isDeleted).toBe(true);
  });
});

describe("simulation and AI routes", () => {
  it("does not persist preview results and is deterministic for a fixed seed", async () => {
    const { agent } = await userAgent("simulation");
    const world = await createWorld(agent);
    const kingdom = await createKingdom(agent, String(world._id));
    await Kingdom.updateOne(
      { _id: kingdom._id },
      { $set: { population: 1000, food: 800, stability: 65 } }
    );
    const beforeWorld = await World.findById(world._id).lean();
    const beforeKingdom = await Kingdom.findById(kingdom._id).lean();
    const beforeEvents = await Event.countDocuments({ worldId: world._id });
    const route = `/api/worlds/${world._id}/simulate`;
    const payload = { years: 3, preview: true, seed: 8675309 };
    const first = await agent.post(route).send(payload).expect(200);
    const second = await agent.post(route).send(payload).expect(200);
    expect(first.body).toEqual(second.body);
    expect(await World.findById(world._id).lean()).toEqual(beforeWorld);
    expect(await Kingdom.findById(kingdom._id).lean()).toEqual(beforeKingdom);
    expect(await Event.countDocuments({ worldId: world._id })).toBe(beforeEvents);
  });

  it("requires a cookie on AI routes and enforces the shared per-user limiter", async () => {
    const { agent } = await userAgent("ai-limit");
    const world = await createWorld(agent);
    const path = `/api/worlds/${world._id}/ai/contradiction-scan`;
    expect((await supertest(app).post(path)).status).toBe(401);
    for (let request = 0; request < 10; request += 1) {
      await agent.post(path).expect(200);
    }
    const limited = await agent.post(path).expect(429);
    expect(limited.body.message).toContain("Too many AI requests");
  });
});
