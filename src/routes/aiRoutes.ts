import { Router } from "express";
import {
  generateCharacterDraft,
  generateEventDraft,
  generateKingdomDraft,
  scanWorldContradictions,
} from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";
import { aiRequestLimiter } from "./aiRateLimiter.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

const router = Router({ mergeParams: true });

router.post("/kingdom-draft", protect, validateObjectIds("worldId"), aiRequestLimiter, generateKingdomDraft);
router.post("/character-draft", protect, validateObjectIds("worldId"), aiRequestLimiter, generateCharacterDraft);
router.post("/event-draft", protect, validateObjectIds("worldId"), aiRequestLimiter, generateEventDraft);
router.post(
  "/contradiction-scan",
  protect,
  validateObjectIds("worldId"),
  aiRequestLimiter,
  scanWorldContradictions
);

export default router;
