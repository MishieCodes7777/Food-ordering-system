import crypto from "crypto";
import redisClient from "./redisClient.js";

// Holds the pending (not-yet-created) registration plus a hashed OTP,
// keyed by phone number, until it's verified. Uses Redis when configured
// (required for correctness across more than one backend instance), falling
// back to an in-memory Map otherwise — same pattern as tokenBlacklist.js /
// loginLockout.js.
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

const pendingByPhone = new Map(); // in-memory fallback only: phone -> { data, expiresAt }
const keyFor = (phone) => `otp:register:${phone}`;

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

export const generateOtp = () => String(crypto.randomInt(100000, 1000000)); // 6 digits

const readPending = async (phone) => {
  if (redisClient) {
    const raw = await redisClient.get(keyFor(phone));
    return raw ? JSON.parse(raw) : null;
  }

  const entry = pendingByPhone.get(phone);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    pendingByPhone.delete(phone);
    return null;
  }
  return entry.data;
};

const writePending = async (phone, record, ttlSeconds = OTP_TTL_SECONDS) => {
  if (redisClient) {
    await redisClient.set(keyFor(phone), JSON.stringify(record), "EX", ttlSeconds);
    return;
  }
  pendingByPhone.set(phone, { data: record, expiresAt: Date.now() + ttlSeconds * 1000 });
};

// Stores a fresh OTP + the registration data to create once it's verified.
// Enforces a resend cooldown so a client can't hammer the SMS provider.
export const createPendingRegistration = async (phone, { name, email, passwordHash }, otp) => {
  const existing = await readPending(phone);
  if (existing) {
    const elapsedMs = Date.now() - existing.lastSentAt;
    if (elapsedMs < RESEND_COOLDOWN_SECONDS * 1000) {
      return { allowed: false, retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000) };
    }
  }

  await writePending(phone, {
    name,
    email,
    passwordHash,
    phone,
    otpHash: hashOtp(otp),
    attempts: 0,
    lastSentAt: Date.now(),
  });

  return { allowed: true };
};

// Returns { valid: true, registrationData } on success, or
// { valid: false, reason } where reason is "expired" | "too_many_attempts" | "incorrect".
export const verifyPendingOtp = async (phone, otp) => {
  const pending = await readPending(phone);
  if (!pending) return { valid: false, reason: "expired" };

  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
    await clearPendingRegistration(phone);
    return { valid: false, reason: "too_many_attempts" };
  }

  if (pending.otpHash !== hashOtp(otp)) {
    pending.attempts += 1;

    if (redisClient) {
      const ttl = await redisClient.ttl(keyFor(phone));
      await writePending(phone, pending, ttl > 0 ? ttl : OTP_TTL_SECONDS);
    } else {
      const entry = pendingByPhone.get(phone);
      if (entry) entry.data = pending;
    }

    return { valid: false, reason: "incorrect", attemptsRemaining: MAX_VERIFY_ATTEMPTS - pending.attempts };
  }

  return { valid: true, registrationData: pending };
};

export const clearPendingRegistration = async (phone) => {
  if (redisClient) {
    await redisClient.del(keyFor(phone));
    return;
  }
  pendingByPhone.delete(phone);
};
