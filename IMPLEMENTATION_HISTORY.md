# Implementation History

This file summarizes the feature steps completed during the WorldForge AI work sessions. Tags identify the area, and function names identify the main entry points or pure logic for each step.

## Step 1 — World timeline UI

**Tags:** `frontend` `timeline` `events`

- Added the world timeline route and category/entity filters.
- Added event cards with linked characters and kingdoms, deleted-entity fallback chips, sorting, and local delete/edit updates.
- Added event create/edit modal with year, category, description, and linked-entity fields.
- Added the Timeline link on the world detail page.

**Functions:** `sortEvents`, `fetchTimeline`, `handleSaved`, `handleDelete`, `handleSubmit`

**Main files:** `../worldforge-ai/app/worlds/[id]/timeline/page.tsx`, `../worldforge-ai/components/event/EventModal.tsx`, `../worldforge-ai/types/event.ts`

## Step 2 — AI event drafts

**Tags:** `backend` `ai` `events` `consistency`

- Added the protected event-draft endpoint using the shared AI rate limiter.
- Loaded world, character, kingdom, and event context; returned resolved entity names and IDs without saving an event.
- Added history consistency checks and a single retry before returning a conflict.
- Added the Event model because it was absent from the backend checkout at implementation time.

**Functions:** `generateEventDraft`, `checkEventConsistency`

**Main files:** `src/controllers/aiController.ts`, `src/services/consistency.ts`, `src/models/Event.ts`, `src/routes/aiRoutes.ts`

## Step 3 — AI-assisted event form

**Tags:** `frontend` `ai` `events`

- Added AI assist to event creation only, passing a valid selected year and applying draft fields and linked entity IDs without submitting.
- Added the timeline shortcut that opens the modal with the AI idea input focused.
- Preserved the existing 429 message and displayed backend 502 messages with a retry suggestion.

**Functions:** `applyDraft`, `handleGenerate`

**Main files:** `../worldforge-ai/components/ui/AiAssist.tsx`, `../worldforge-ai/components/event/EventModal.tsx`, `../worldforge-ai/app/worlds/[id]/timeline/page.tsx`

## Step 4 — Kingdom simulation engine and API

**Tags:** `backend` `simulation` `events`

- Added simulation state types, a seeded Mulberry32 random generator, and independent drought, food, population, and stability rules.
- Added deterministic year-by-year simulation with 50-year and 300-event caps.
- Added the protected simulation endpoint with preview mode, duplicate-event filtering, kingdom bulk updates, timeline event insertion, and a per-user rate limiter.
- Added simulation values to World, Kingdom, and Event schemas.

**Functions:** `createRng`, `droughtRule`, `foodRule`, `populationRule`, `stabilityRule`, `stepKingdom`, `runSimulation`, `simulateWorld`

**Main files:** `src/simulation/`, `src/controllers/simulationController.ts`, `src/routes/simulationRoutes.ts`, `src/models/World.ts`, `src/models/Kingdom.ts`, `src/models/Event.ts`

## Step 5 — Simulation UI

**Tags:** `frontend` `simulation` `timeline`

- Added the simulation page with preview and save controls, kingdom stat bars, drought labels, population chart, and year-grouped generated events.
- Added the Simulate link on the world detail page and updated frontend world/kingdom types.

**Functions:** `fetchWorldData`, `handleRun`, `PopulationChart`, `StatBar`

**Main files:** `../worldforge-ai/app/worlds/[id]/simulate/page.tsx`, `../worldforge-ai/app/worlds/[id]/page.tsx`, `../worldforge-ai/types/world.ts`, `../worldforge-ai/types/kingdom.ts`

## Step 6 — Pure logic tests

**Tags:** `backend` `tests` `simulation` `consistency`

- Added Vitest and the `npm test` script.
- Added focused tests for RNG reproducibility/range, simulation rules and caps, and event consistency.
- Kept tests isolated from database and HTTP behavior, with shared builders in a helper module.

**Functions tested:** `createRng`, `droughtRule`, `foodRule`, `populationRule`, `stabilityRule`, `runSimulation`, `checkEventConsistency`

**Main files:** `src/simulation/*.test.ts`, `src/simulation/tests/helpers.ts`, `src/services/consistency.test.ts`

## Step 7 — Authentication and HTTP hardening

**Tags:** `backend` `security` `auth` `http`

- Split the configured Express app from the MongoDB-connected server and added graceful shutdown.
- Added Zod environment validation and migrated runtime configuration access to the validated `env` export.
- Switched authentication to an HTTP-only `wf_token` cookie, pinned JWT signing and verification to HS256, added logout, and validated credentials before database access.
- Added dummy bcrypt comparison for unknown login emails and normalized-email plus per-IP auth rate limits.
- Added nested NoSQL-key rejection, route-parameter ObjectId validation, Helmet, restricted credentialed CORS, trust-proxy configuration, and generic 404/error responses.
- Excluded tests from TypeScript build output and updated `.env.example`.

**Functions/middleware:** `protect`, `registerUser`, `loginUser`, `logoutUser`, `getMe`, `generateToken`, `noSqlGuard`, `validateObjectIds`, `connectDB`, `startServer`

**Main files:** `src/app.ts`, `src/server.ts`, `src/config/env.ts`, `src/controllers/authController.ts`, `src/middleware/`, `src/routes/authRoutes.ts`, `src/routes/authRateLimiters.ts`
