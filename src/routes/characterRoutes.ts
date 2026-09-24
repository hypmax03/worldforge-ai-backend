import { Router } from "express";
import {
  createCharacter,
  getCharacters,
  getCharacterById,
  updateCharacter,
  deleteCharacter,
} from "../controllers/characterController.js";
import { protect } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

router.post("/", protect, createCharacter);
router.get("/", protect, getCharacters);
router.get("/:id", protect, getCharacterById);
router.put("/:id", protect, updateCharacter);
router.delete("/:id", protect, deleteCharacter);

export default router;
