import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import { googleLogin } from "../controllers/googleAuthController.js";
import validate from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../utils/validation.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Register (rate limited)
router.post("/register", authLimiter, validate(registerSchema), register);

// Login (rate limited)
router.post("/login", authLimiter, validate(loginSchema), login);

// Google login
router.post("/google", authLimiter, googleLogin);

// Logout (requires auth)
router.post("/logout", auth, logout);

export default router;
