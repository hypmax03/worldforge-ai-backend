import { Router } from "express";
import {
  createCharacter,
  getCharacters,
  getCharacterById,
  updateCharacter,
  deleteCharacter,
} from "../controllers/characterController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

const router = Router({ mergeParams: true });

router.post("/", protect, validateObjectIds("worldId"), createCharacter);
router.get("/", protect, validateObjectIds("worldId"), getCharacters);
router.get("/:id", protect, validateObjectIds("worldId", "id"), getCharacterById);
router.put("/:id", protect, validateObjectIds("worldId", "id"), updateCharacter);
router.delete("/:id", protect, validateObjectIds("worldId", "id"), deleteCharacter);

export default router;
