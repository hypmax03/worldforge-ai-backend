import bcrypt from "bcryptjs";
import supertest from "supertest";
import type { Types } from "mongoose";
import app from "../app.js";
import { User } from "../models/User.js";
import type { IWorld } from "../models/World.js";
import type { IKingdom } from "../models/Kingdom.js";
import type { ICity } from "../models/City.js";
import type { ICharacter } from "../models/Character.js";
import type { IRelationship } from "../models/Relationship.js";

export type TestAgent = ReturnType<typeof supertest.agent>;

export async function registerAgent(email: string, password = "test-password-123") {
  const agent = supertest.agent(app);
  const response = await agent.post("/api/auth/register").send({ email, password });
  if (response.status !== 201) {
    throw new Error(`Registration failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return {
    agent,
    user: response.body.user as { id: string; email: string },
    password,
    response,
  };
}

export async function loginAgent(email: string, password = "test-password-123") {
  const agent = supertest.agent(app);
  const response = await agent.post("/api/auth/login").send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Login failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return { agent, user: response.body.user as { id: string; email: string }, password };
}

export async function createUserAgent(email: string) {
  const password = "test-password-123";
  await User.create({ email, passwordHash: await bcrypt.hash(password, 10) });
  return loginAgent(email, password);
}

export async function createWorld(agent: TestAgent, name = "Test World") {
  const response = await agent.post("/api/worlds").send({ name, genre: "fantasy" });
  expectStatus(response.status, 201, "world");
  return response.body as IWorld & { _id: Types.ObjectId };
}

export async function createKingdom(agent: TestAgent, worldId: string, name = "Test Kingdom") {
  const response = await agent
    .post(`/api/worlds/${worldId}/kingdoms`)
    .send({ name, government: "Monarchy", population: 1000 });
  expectStatus(response.status, 201, "kingdom");
  return response.body as IKingdom & { _id: Types.ObjectId };
}

export async function createCity(agent: TestAgent, kingdomId: string, name = "Test City") {
  const response = await agent
    .post(`/api/kingdoms/${kingdomId}/cities`)
    .send({ name, population: 500 });
  expectStatus(response.status, 201, "city");
  return response.body as ICity & { _id: Types.ObjectId };
}

export async function createCharacter(
  agent: TestAgent,
  worldId: string,
  name = "Test Character",
  fields: Record<string, unknown> = {}
) {
  const response = await agent
    .post(`/api/worlds/${worldId}/characters`)
    .send({ name, ...fields });
  expectStatus(response.status, 201, "character");
  return response.body as ICharacter & { _id: Types.ObjectId };
}

export async function createRelationship(
  agent: TestAgent,
  worldId: string,
  from: { type: "character" | "kingdom"; id: string },
  to: { type: "character" | "kingdom"; id: string },
  type: string
) {
  const response = await agent
    .post(`/api/worlds/${worldId}/relationships`)
    .send({
      fromType: from.type,
      fromId: from.id,
      toType: to.type,
      toId: to.id,
      type,
    });
  expectStatus(response.status, 201, "relationship");
  return response.body as IRelationship & { _id: Types.ObjectId };
}

export async function createEvent(
  worldId: string,
  ownerId: string,
  fields: Record<string, unknown> = {}
) {
  const { Event } = await import("../models/Event.js");
  return Event.create({
    worldId,
    ownerId,
    year: 1,
    title: "Test Event",
    category: "other",
    ...fields,
  });
}

function expectStatus(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`Failed to create ${label}: expected ${expected}, got ${actual}`);
  }
}
