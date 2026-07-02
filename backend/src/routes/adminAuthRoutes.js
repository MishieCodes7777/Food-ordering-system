import express from "express";
import { registerAdmin, loginAdmin, logoutAdmin, getAdminProfile } from "../controllers/adminAuthController.js";
import { googleAdminLogin } from "../controllers/googleAuthController.js";
import adminAuth from "../middleware/adminAuth.js";
import { requireRole } from "../middleware/adminAuth.js";
import validate from "../middleware/validate.js";
import { adminRegisterSchema, adminLoginSchema } from "../utils/adminValidation.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public routes (rate limited)
router.post("/login", authLimiter, validate(adminLoginSchema), loginAdmin);
router.post("/google", authLimiter, googleAdminLogin);

// Protected routes
router.post("/register", adminAuth, requireRole("owner"), validate(adminRegisterSchema), registerAdmin);
router.post("/logout", adminAuth, logoutAdmin);
router.get("/me", adminAuth, getAdminProfile);

export default router;
