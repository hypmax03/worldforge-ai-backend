import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import worldRoutes from "./routes/worldRoutes.js";
import kingdomRoutes from "./routes/kingdomRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/worlds", worldRoutes);
app.use("/api/worlds/:worldId/kingdoms", kingdomRoutes);
app.use("/api/kingdoms/:kingdomId/cities", cityRoutes);
app.use("/api/worlds/:worldId/characters", characterRoutes);

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();