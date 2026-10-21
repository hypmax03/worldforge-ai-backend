import { Router } from "express";
import {
  generateCharacterDraft,
  generateKingdomDraft,
} from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";
import { aiRequestLimiter } from "./aiRateLimiter.js";

const router = Router({ mergeParams: true });

router.post("/kingdom-draft", protect, aiRequestLimiter, generateKingdomDraft);
router.post("/character-draft", protect, aiRequestLimiter, generateCharacterDraft);

export default router;
