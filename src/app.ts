import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import worldRoutes from "./routes/worldRoutes.js";
import kingdomRoutes from "./routes/kingdomRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import kingdomAiRoutes from "./routes/kingdomAiRoutes.js";
import simulationRoutes from "./routes/simulationRoutes.js";
import {
  relationshipRoutes,
  worldRelationshipRoutes,
} from "./routes/relationshipRoutes.js";
import { noSqlGuard } from "./middleware/noSqlGuard.js";
import trashRoutes from "./routes/trashRoutes.js";

const app = express();

app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(noSqlGuard);
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/trash", trashRoutes);
app.use("/api/worlds", worldRoutes);
app.use("/api/worlds/:worldId/kingdoms", kingdomRoutes);
app.use("/api/kingdoms", kingdomRoutes);
app.use("/api/kingdoms/:kingdomId/cities", cityRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/worlds/:worldId/characters", characterRoutes);
app.use("/api/characters", characterRoutes);
app.use("/api/kingdoms/:kingdomId/ai", kingdomAiRoutes);
app.use("/api/worlds/:worldId/ai", aiRoutes);
app.use("/api/worlds/:worldId/simulate", simulationRoutes);
app.use("/api/worlds/:worldId/relationships", worldRelationshipRoutes);
app.use("/api/relationships", relationshipRoutes);

app.get("/api/health", (_req: Request, res: Response) => {
  return res.status(200).json({ status: "ok" });
});

app.use((_req: Request, res: Response) => {
  return res.status(404).json({ message: "Not found" });
});

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("Unhandled request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
);

export default app;
