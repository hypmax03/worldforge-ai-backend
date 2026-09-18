import { Router } from "express";
import { createWorld, getWorlds, getWorldById, updateWorld, deleteWorld } from "../controllers/worldController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/", protect, createWorld);
router.get("/", protect, getWorlds);
router.get("/:id", protect, getWorldById);
router.put("/:id", protect, updateWorld);
router.delete("/:id", protect, deleteWorld);

export default router;