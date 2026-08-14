import redisClient from "./redisClient.js";

// Login-attempt lockout tracker. Uses Redis when REDIS_URL is configured —
// required for this to work correctly across more than one backend instance,
// since each instance would otherwise keep its own independent counters and
// an attacker gets a fresh lockout budget on every instance a load balancer
// routes them to. Falls back to an in-memory Map when Redis isn't
// configured, matching prior local-dev behavior. Every method is async
// regardless of backend so callers don't need to branch.
//
// `namespace` keeps customer and admin lockouts in separate keyspaces —
// required once state is shared in Redis, kept for the in-memory fallback
// too so both backends behave identically.
export const createLockoutTracker = ({ namespace, maxAttempts = 10, lockTimeMs = 30 * 60 * 1000 } = {}) => {
  const attemptsByEmail = new Map(); // in-memory fallback only
  const keyFor = (email) => `lockout:${namespace}:${email}`;

  const readAttempts = async (email) => {
    if (redisClient) {
      const raw = await redisClient.get(keyFor(email));
      return raw ? JSON.parse(raw) : null;
    }
    return attemptsByEmail.get(email) || null;
  };

  const writeAttempts = async (email, attempts) => {
    if (redisClient) {
      await redisClient.set(keyFor(email), JSON.stringify(attempts), "PX", lockTimeMs);
      return;
    }
    attemptsByEmail.set(email, attempts);
  };

  const deleteAttempts = async (email) => {
    if (redisClient) {
      await redisClient.del(keyFor(email));
      return;
    }
    attemptsByEmail.delete(email);
  };

  const isLocked = async (email) => {
    const attempts = await readAttempts(email);
    if (!attempts) return false;

    if (attempts.count >= maxAttempts) {
      const timePassed = Date.now() - attempts.lastAttempt;
      if (timePassed < lockTimeMs) return true;
      await deleteAttempts(email); // lock expired, reset
      return false;
    }
    return false;
  };

  const recordFailure = async (email) => {
    const attempts = (await readAttempts(email)) || { count: 0, lastAttempt: Date.now() };
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    await writeAttempts(email, attempts);
  };

  const remainingAttempts = async (email) => maxAttempts - ((await readAttempts(email))?.count || 0);

  const remainingLockMinutes = async (email) => {
    const attempts = await readAttempts(email);
    if (!attempts) return 0;
    return Math.ceil((lockTimeMs - (Date.now() - attempts.lastAttempt)) / 60000);
  };

  const clear = async (email) => deleteAttempts(email);

  return { isLocked, recordFailure, remainingAttempts, remainingLockMinutes, clear, maxAttempts };
};
