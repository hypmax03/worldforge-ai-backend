import { Router } from "express";
import {
  createKingdom,
  getKingdoms,
  getKingdomById,
  updateKingdom,
  deleteKingdom,
} from "../controllers/kingdomController.js";
import { protect } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

router.post("/", protect, createKingdom);
router.get("/", protect, getKingdoms);
router.get("/:id", protect, getKingdomById);
router.put("/:id", protect, updateKingdom);
router.delete("/:id", protect, deleteKingdom);

export default router;
