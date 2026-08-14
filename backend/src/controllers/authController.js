import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/db.js";
import { blacklistToken } from "../utils/tokenBlacklist.js";
import { authCookieOptions, clearAuthCookieOptions } from "../utils/cookieOptions.js";
import { createLockoutTracker } from "../utils/loginLockout.js";
import { generateOtp, createPendingRegistration, verifyPendingOtp, clearPendingRegistration } from "../utils/otpStore.js";
import { sendOtpSms } from "../config/msg91.js";

const lockout = createLockoutTracker({ namespace: "customer" });

// Helper to set HTTP-only cookie
const setTokenCookie = (res, token) => {
  res.cookie("token", token, authCookieOptions());
};

// POST /api/auth/register/send-otp — Step 1 of registration: validate the
// details and text an OTP to the phone number. No account is created yet —
// the account only gets created once the OTP is confirmed (verifyRegistrationOtp).
export const sendRegistrationOtp = async (req, res, next) => {
  try {
    const { name, password, phone } = req.body;
    const email = req.body.email.trim().toLowerCase();

    // Check email/phone aren't already registered before spending an SMS on it
    const existing = await pool.query("SELECT id FROM users WHERE email = $1 OR phone = $2", [email, phone]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Unable to create account. Please try with different credentials." });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const otp = generateOtp();
    const { allowed, retryAfterSeconds } = await createPendingRegistration(phone, { name, email, passwordHash }, otp);

    if (!allowed) {
      return res.status(429).json({ message: `Please wait ${retryAfterSeconds}s before requesting another OTP.` });
    }

    await sendOtpSms(phone, otp);

    res.json({
      message: "OTP sent to your mobile number",
      // Dev convenience only: surfaces the OTP in the response when no real
      // SMS provider is configured, so the flow is testable without reading
      // server logs. Never happens once MSG91 credentials are set — this is
      // deliberately keyed off MSG91 config, not NODE_ENV, so it still works
      // on a production deploy that hasn't set up MSG91 yet.
      ...(!process.env.MSG91_AUTH_KEY ? { dev_otp: otp } : {}),
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/register/verify-otp — Step 2: confirm the OTP and actually
// create the account. This is the only place a customer account gets created.
export const verifyRegistrationOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    const result = await verifyPendingOtp(phone, otp);

    if (!result.valid) {
      if (result.reason === "expired") {
        return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
      }
      if (result.reason === "too_many_attempts") {
        return res.status(429).json({ message: "Too many incorrect attempts. Please request a new OTP." });
      }
      return res.status(400).json({
        message: `Incorrect OTP. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? "" : "s"} remaining.`,
      });
    }

    const { name, email, passwordHash } = result.registrationData;

    // Re-check uniqueness — time passed since send-otp, someone else could
    // have registered the same email/phone in the meantime.
    const existing = await pool.query("SELECT id FROM users WHERE email = $1 OR phone = $2", [email, phone]);
    if (existing.rows.length > 0) {
      await clearPendingRegistration(phone);
      return res.status(400).json({ message: "Unable to create account. Please try with different credentials." });
    }

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password_hash, phone, phone_verified) VALUES ($1, $2, $3, $4, TRUE) RETURNING id, name, email, phone, phone_verified",
      [name, email, passwordHash, phone]
    );

    await clearPendingRegistration(phone);

    const token = jwt.sign({ id: newUser.rows[0].id, type: "customer" }, process.env.JWT_SECRET, {
      expiresIn: "3d",
    });

    setTokenCookie(res, token);

    res.status(201).json({ user: newUser.rows[0], token });
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = req.body.email.trim().toLowerCase();

    // Check account lockout
    if (await lockout.isLocked(email)) {
      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${await lockout.remainingLockMinutes(email)} minutes.`,
      });
    }

    // Check if user exists
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      await lockout.recordFailure(email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password (using password_hash column)
    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      await lockout.recordFailure(email);
      const remaining = await lockout.remainingAttempts(email);

      if (remaining <= 3 && remaining > 0) {
        return res.status(400).json({
          message: `Invalid email or password. ${remaining} attempts remaining before lockout.`,
        });
      }

      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Success — clear failed attempts
    await lockout.clear(email);

    // Check if this is the user's first login (created_at === updated_at means never logged in before)
    const isFirstLogin = user.rows[0].created_at?.getTime() === user.rows[0].updated_at?.getTime();

    // Update updated_at to track login activity
    await pool.query("UPDATE users SET updated_at = NOW() WHERE id = $1", [user.rows[0].id]);

    // Generate token
    const token = jwt.sign({ id: user.rows[0].id, type: "customer" }, process.env.JWT_SECRET, {
      expiresIn: "3d",
    });

    // Set HTTP-only cookie
    setTokenCookie(res, token);

    const { password_hash, ...userData } = user.rows[0];
    res.json({ user: userData, token, is_first_login: isFirstLogin });
  } catch (error) {
    next(error);
  }
};

// Logout user (clear cookie + blacklist token)
export const logout = async (req, res) => {
  // Blacklist the current token so it can't be reused
  if (req.token) {
    await blacklistToken(req.token);
  }

  res.clearCookie("token", clearAuthCookieOptions());
  res.json({ message: "Logged out successfully" });
};
