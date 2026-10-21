import { Router } from "express";
import {
  createRelationship,
  deleteRelationship,
  getRelationships,
} from "../controllers/relationshipController.js";
import { protect } from "../middleware/auth.js";

export const worldRelationshipRoutes = Router({ mergeParams: true });
export const relationshipRoutes = Router();

worldRelationshipRoutes.post("/", protect, createRelationship);
worldRelationshipRoutes.get("/", protect, getRelationships);

relationshipRoutes.delete("/:id", protect, deleteRelationship);
