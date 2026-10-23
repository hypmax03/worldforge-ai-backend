import { Router } from "express";
import { simulateWorld } from "../controllers/simulationController.js";
import { protect } from "../middleware/auth.js";
import { simulationRequestLimiter } from "./simulationRateLimiter.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

const router = Router({ mergeParams: true });

router.post(
  "/",
  protect,
  validateObjectIds("worldId"),
  simulationRequestLimiter,
  simulateWorld
);

export default router;
