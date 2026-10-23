import { Router } from "express";
import { createWorld, getWorlds, getWorldById, updateWorld, deleteWorld } from "../controllers/worldController.js";
import { getWorldCities } from "../controllers/cityController.js";
import { getWorldMap, updateWorldMap } from "../controllers/worldMapController.js";
import { getWorldAudit } from "../controllers/worldAuditController.js";
import { exportWorld, getWorldTrash } from "../controllers/trashController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";
import { worldExportRateLimiter } from "./worldExportRateLimiter.js";

const router = Router();

router.post("/", protect, createWorld);
router.get("/", protect, getWorlds);
router.get("/:worldId/cities", protect, validateObjectIds("worldId"), getWorldCities);
router.get("/:worldId/map", protect, validateObjectIds("worldId"), getWorldMap);
router.put("/:worldId/map", protect, validateObjectIds("worldId"), updateWorldMap);
router.get("/:worldId/audit", protect, validateObjectIds("worldId"), getWorldAudit);
router.get("/:worldId/trash", protect, validateObjectIds("worldId"), getWorldTrash);
router.get(
  "/:worldId/export",
  protect,
  validateObjectIds("worldId"),
  worldExportRateLimiter,
  exportWorld
);
router.get("/:id", protect, validateObjectIds("id"), getWorldById);
router.put("/:id", protect, validateObjectIds("id"), updateWorld);
router.delete("/:id", protect, validateObjectIds("id"), deleteWorld);

export default router;