import { Router } from "express";
import {
  getMe,
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import {
  loginEmailLimiter,
  loginIpLimiter,
  registerIpLimiter,
} from "./authRateLimiters.js";

const router = Router();

router.post("/register", registerIpLimiter, registerUser);
router.post("/login", loginIpLimiter, loginEmailLimiter, loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);

export default router;