import jwt from "jsonwebtoken";
import redisClient from "./redisClient.js";

// Token blacklist for logout. Uses Redis when REDIS_URL is configured —
// required for logout to actually invalidate a session across more than one
// backend instance (without it, instance A blacklists a token but instance B
// has never heard of it). Falls back to an in-memory Map otherwise, matching
// prior local-dev behavior. Both methods are async regardless of backend.
const blacklistedTokens = new Map(); // in-memory fallback only: token -> expiry timestamp (ms)
const keyFor = (token) => `blacklist:${token}`;

export const blacklistToken = async (token) => {
  const decoded = jwt.decode(token);
  const expiryMs = decoded?.exp ? decoded.exp * 1000 : Date.now() + 3 * 24 * 60 * 60 * 1000;

  if (redisClient) {
    const ttlSeconds = Math.max(1, Math.ceil((expiryMs - Date.now()) / 1000));
    await redisClient.set(keyFor(token), "1", "EX", ttlSeconds);
    return;
  }

  blacklistedTokens.set(token, expiryMs);
};

export const isTokenBlacklisted = async (token) => {
  if (redisClient) {
    const exists = await redisClient.exists(keyFor(token));
    return exists === 1;
  }

  const expiryMs = blacklistedTokens.get(token);
  if (expiryMs === undefined) return false;

  if (Date.now() >= expiryMs) {
    blacklistedTokens.delete(token);
    return false;
  }

  return true;
};

// Only needed for the in-memory fallback — Redis expires keys on its own via EX.
if (!redisClient) {
  setInterval(() => {
    const now = Date.now();
    for (const [token, expiryMs] of blacklistedTokens) {
      if (now >= expiryMs) {
        blacklistedTokens.delete(token);
      }
    }
  }, 60 * 60 * 1000);
}
