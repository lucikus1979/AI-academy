// api/lib/rate-limit.js
// Distributed rate limiting using Upstash Redis
// Falls back to in-memory if Redis is not configured (dev environment)

import { Redis } from '@upstash/redis';

// ============================================================
// CONFIGURATION
// ============================================================

const RATE_WINDOW_SECONDS = 60;           // 1 minute window
const RATE_MAX_PER_IP = 20;               // 20 requests per IP per minute
const RATE_MAX_PER_ROLE = 100;            // 100 requests per role per minute (global)

// In-memory fallback for local development
const memoryStore = new Map();

// Lazy-initialized Redis client
let redis = null;

/**
 * Check if Upstash Redis is configured.
 * KV_REST_API_URL and KV_REST_API_TOKEN are set via Vercel integration.
 */
function isRedisConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Get or create the Redis client (lazy singleton).
 */
function getRedis() {
  if (!redis && isRedisConfigured()) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return redis;
}

// ============================================================
// DISTRIBUTED RATE LIMITING (Vercel KV)
// ============================================================

/**
 * Check and increment rate limit using Vercel KV.
 * Uses Redis INCR with TTL for atomic counter management.
 *
 * @param {string} key - Rate limit key (e.g., "ratelimit:ip:1.2.3.4")
 * @param {number} max - Maximum allowed requests in window
 * @returns {Promise<{allowed: boolean, current: number, remaining: number}>}
 */
async function checkRateLimitRedis(key, max) {
  try {
    const client = getRedis();
    if (!client) return { allowed: true, current: 0, remaining: max };

    // INCR is atomic — creates key with value 1 if it doesn't exist
    const current = await client.incr(key);

    // Set expiry only on first request (when counter is 1)
    if (current === 1) {
      await client.expire(key, RATE_WINDOW_SECONDS);
    }

    return {
      allowed: current <= max,
      current,
      remaining: Math.max(0, max - current),
    };
  } catch (err) {
    console.error('Redis rate limit error:', err.message);
    // Fail open on Redis errors to avoid blocking legitimate users
    return { allowed: true, current: 0, remaining: max };
  }
}

// ============================================================
// IN-MEMORY FALLBACK (for local dev)
// ============================================================

/**
 * In-memory rate limiting fallback.
 * Note: Does not persist across serverless invocations in production!
 */
function checkRateLimitMemory(key, max) {
  const now = Date.now();
  const windowMs = RATE_WINDOW_SECONDS * 1000;

  // Cleanup stale entries periodically
  if (memoryStore.size > 100) {
    for (const [k, entry] of memoryStore) {
      if (now - entry.windowStart > windowMs * 5) {
        memoryStore.delete(k);
      }
    }
  }

  if (!memoryStore.has(key)) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, current: 1, remaining: max - 1 };
  }

  const entry = memoryStore.get(key);

  // Reset window if expired
  if (now - entry.windowStart > windowMs) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, current: 1, remaining: max - 1 };
  }

  entry.count += 1;
  return {
    allowed: entry.count <= max,
    current: entry.count,
    remaining: Math.max(0, max - entry.count),
  };
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Extract client IP from Vercel request headers.
 */
export function getClientIP(req) {
  return req.headers['x-real-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || 'unknown';
}

/**
 * Check rate limits for a chat request.
 * Enforces both per-IP and per-role limits.
 *
 * @param {Object} req - HTTP request object
 * @param {string} role - Normalized role (e.g., "FDE", "AI-SE")
 * @returns {Promise<{allowed: boolean, reason?: string, retryAfter?: number}>}
 */
export async function checkRateLimit(req, role) {
  const ip = getClientIP(req);
  const ipKey = `ratelimit:ip:${ip}`;
  const roleKey = `ratelimit:role:${role.toUpperCase()}`;

  const useRedis = isRedisConfigured();

  // Check both limits
  const [ipResult, roleResult] = useRedis
    ? await Promise.all([
        checkRateLimitRedis(ipKey, RATE_MAX_PER_IP),
        checkRateLimitRedis(roleKey, RATE_MAX_PER_ROLE),
      ])
    : [
        checkRateLimitMemory(ipKey, RATE_MAX_PER_IP),
        checkRateLimitMemory(roleKey, RATE_MAX_PER_ROLE),
      ];

  // Determine which limit was hit (if any)
  if (!ipResult.allowed) {
    return {
      allowed: false,
      reason: 'ip',
      retryAfter: RATE_WINDOW_SECONDS,
      message: `Rate limit exceeded. Please wait ${RATE_WINDOW_SECONDS} seconds.`,
    };
  }

  if (!roleResult.allowed) {
    return {
      allowed: false,
      reason: 'role',
      retryAfter: RATE_WINDOW_SECONDS,
      message: `Too many requests for ${role}. Please wait ${RATE_WINDOW_SECONDS} seconds.`,
    };
  }

  return {
    allowed: true,
    ipRemaining: ipResult.remaining,
    roleRemaining: roleResult.remaining,
  };
}

/**
 * Get rate limit configuration (for debugging/headers).
 */
export function getRateLimitConfig() {
  return {
    windowSeconds: RATE_WINDOW_SECONDS,
    maxPerIp: RATE_MAX_PER_IP,
    maxPerRole: RATE_MAX_PER_ROLE,
    backend: isRedisConfigured() ? 'upstash-redis' : 'memory',
  };
}
