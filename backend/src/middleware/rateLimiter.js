import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../utils/redisClient.js";

// Without a shared store, each backend instance keeps its own independent
// counters — an attacker gets a fresh rate-limit budget on every instance a
// load balancer routes them to. Use Redis when configured; express-rate-limit
// falls back to its own in-memory store automatically when `store` is omitted.
const redisStoreOptions = redisClient
  ? { store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }) }
  : {};

// Auth rate limiter — 30 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 requests per window
  message: {
    message: "Too many attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  ...redisStoreOptions,
});

// General API rate limiter — 500 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    message: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...redisStoreOptions,
});

// OTP send/verify — each send costs real money via the SMS provider, and
// verify is a 6-digit brute-force target, so both get a much tighter budget
// than general auth traffic. This is IP-based, on top of otpStore.js's own
// per-phone cooldown and per-phone attempt cap.
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many OTP requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...redisStoreOptions,
});

// Tighter limiter for routes that call out to Razorpay on every request —
// the blanket apiLimiter (500/15min) is shared with harmless read traffic
// and doesn't meaningfully cap how many paid-API calls a client can trigger.
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many payment requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...redisStoreOptions,
});
