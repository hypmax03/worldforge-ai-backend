import { Router } from "express";
import {
  createCity,
  getCities,
  getCityById,
  updateCity,
  deleteCity,
} from "../controllers/cityController.js";
import { protect } from "../middleware/auth.js";

const router = Router({ mergeParams: true });

router.post("/", protect, createCity);
router.get("/", protect, getCities);
router.get("/:id", protect, getCityById);
router.put("/:id", protect, updateCity);
router.delete("/:id", protect, deleteCity);

export default router;
