import { Router } from "express";
import {
  createRelationship,
  deleteRelationship,
  getRelationships,
} from "../controllers/relationshipController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

export const worldRelationshipRoutes = Router({ mergeParams: true });
export const relationshipRoutes = Router();

worldRelationshipRoutes.post(
  "/",
  protect,
  validateObjectIds("worldId"),
  createRelationship
);
worldRelationshipRoutes.get(
  "/",
  protect,
  validateObjectIds("worldId"),
  getRelationships
);

relationshipRoutes.delete(
  "/:id",
  protect,
  validateObjectIds("id"),
  deleteRelationship
);
