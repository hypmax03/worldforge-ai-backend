import { Router } from "express";
import {
  getDeletedWorlds,
  restoreTrashItem,
  validateTrashType,
} from "../controllers/trashController.js";
import { protect } from "../middleware/auth.js";
import { validateObjectIds } from "../middleware/validateObjectId.js";

const router = Router();

router.get("/worlds", protect, getDeletedWorlds);
router.post(
  "/:type/:id/restore",
  protect,
  validateTrashType,
  validateObjectIds("id"),
  restoreTrashItem
);

export default router;
