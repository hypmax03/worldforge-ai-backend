import { Router } from "express";
import { generateCityDraft } from "../controllers/aiController.js";
import { protect } from "../middleware/auth.js";
import { aiRequestLimiter } from "./aiRateLimiter.js";

const router = Router({ mergeParams: true });

router.post("/city-draft", protect, aiRequestLimiter, generateCityDraft);

export default router;
