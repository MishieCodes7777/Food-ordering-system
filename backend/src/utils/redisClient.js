import Redis from "ioredis";
import logger from "./logger.js";

// Only connects if REDIS_URL is set. Rate limiting, login lockout, and the
// token blacklist all check this and fall back to their existing in-memory
// behavior when it's null — so local dev keeps working with zero setup, and
// production gets real cross-instance shared state once REDIS_URL is set.
// Without this, none of those three can work correctly across more than one
// backend instance (each instance would have its own separate counters).
let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
  });

  redisClient.on("error", (err) => {
    logger.error({ err: { message: err.message } }, "[REDIS] Connection error");
  });

  redisClient.on("connect", () => {
    logger.info("[REDIS] Connected");
  });
}

export default redisClient;
