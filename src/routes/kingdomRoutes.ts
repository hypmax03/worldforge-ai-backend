import { Router } from "express";
import {
  createKingdom,
  getKingdoms,
  getKingdomById,
  updateKingdom,
  deleteKingdom,
} from "../controllers/kingdomController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

const router = Router({ mergeParams: true });

router.post("/", protect, validateObjectIds("worldId"), createKingdom);
router.get("/", protect, validateObjectIds("worldId"), getKingdoms);
router.get("/:id", protect, validateObjectIds("worldId", "id"), getKingdomById);
router.put("/:id", protect, validateObjectIds("worldId", "id"), updateKingdom);
router.delete("/:id", protect, validateObjectIds("worldId", "id"), deleteKingdom);

export default router;
