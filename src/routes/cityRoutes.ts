import { Router } from "express";
import {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity,
} from "../controllers/cityController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

const router = Router({ mergeParams: true });

router.post("/", protect, validateObjectIds("kingdomId"), createCity);
router.get("/", protect, validateObjectIds("kingdomId"), getCities);
router.get("/:id", protect, validateObjectIds("kingdomId", "id"), getCityById);
router.put("/:id", protect, validateObjectIds("kingdomId", "id"), updateCity);
router.delete("/:id", protect, validateObjectIds("kingdomId", "id"), deleteCity);

export default router;
