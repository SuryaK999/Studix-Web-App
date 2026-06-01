const { getCacheClient, isRedisReady } = require('../config/redis');

const MAX_MESSAGES = parseInt(process.env.CHAT_RATE_LIMIT_MAX, 10) || 20;
const WINDOW_SECONDS = parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_SECONDS, 10) || 5;

// In-memory fallback when Redis is unavailable
const memoryLimiter = new Map(); // uid -> { count, resetAt }

/**
 * Returns true if request is allowed, false if rate limited.
 */
async function checkRateLimit(uid) {
  if (isRedisReady()) {
    return checkRedisRateLimit(uid);
  }
  return checkMemoryRateLimit(uid);
}

async function checkRedisRateLimit(uid) {
  try {
    const key = `ratelimit:chat:${uid}`;
    const client = getCacheClient();

    const current = await client.incr(key);
    if (current === 1) {
      // First message in this window — set expiry
      await client.expire(key, WINDOW_SECONDS);
    }

    return current <= MAX_MESSAGES;
  } catch (_) {
    // Redis error — allow the request (fail open)
    return true;
  }
}

function checkMemoryRateLimit(uid) {
  const now = Date.now();
  let record = memoryLimiter.get(uid);

  if (!record || now >= record.resetAt) {
    memoryLimiter.set(uid, { count: 1, resetAt: now + WINDOW_SECONDS * 1000 });
    return true;
  }

  record.count++;
  return record.count <= MAX_MESSAGES;
}

/**
 * Clean up memory limiter periodically (prevent leaks on disconnect).
 */
function cleanupMemoryLimiter(uid) {
  memoryLimiter.delete(uid);
}

module.exports = { checkRateLimit, cleanupMemoryLimiter };
