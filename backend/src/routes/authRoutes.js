import express from "express";
import { sendRegistrationOtp, verifyRegistrationOtp, login, logout } from "../controllers/authController.js";
import { googleLogin } from "../controllers/googleAuthController.js";
import validate from "../middleware/validate.js";
import { sendRegistrationOtpSchema, verifyRegistrationOtpSchema, loginSchema } from "../utils/validation.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Registration is OTP-gated: send-otp validates + texts a code, verify-otp
// confirms it and actually creates the account.
router.post("/register/send-otp", otpLimiter, validate(sendRegistrationOtpSchema), sendRegistrationOtp);
router.post("/register/verify-otp", otpLimiter, validate(verifyRegistrationOtpSchema), verifyRegistrationOtp);

// Login (rate limited)
router.post("/login", authLimiter, validate(loginSchema), login);

// Google login
router.post("/google", authLimiter, googleLogin);

// Logout (requires auth)
router.post("/logout", auth, logout);

export default router;
