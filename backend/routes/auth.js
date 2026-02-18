import express from "express";
import {
  registerParticipant,
  loginUser,
  getMe,
  updatePreferences,
  updateProfile,
  changePassword,
} from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";
import { verifyCaptchaMiddleware } from "../utils/captcha.js";

const router = express.Router();

// Public routes with optional CAPTCHA verification
// CAPTCHA is verified if RECAPTCHA_SECRET_KEY or HCAPTCHA_SECRET_KEY is set in env
router.post("/register", verifyCaptchaMiddleware, registerParticipant);
router.post("/login", verifyCaptchaMiddleware, loginUser);

// Protected routes
router.get("/me", protect, getMe);
router.put("/preferences", protect, authorize("participant"), updatePreferences);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, changePassword);

export default router;
