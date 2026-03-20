/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window approach per IP address.
 *
 * Note: In a serverless environment (Vercel), each instance has its own memory,
 * so this provides per-instance rate limiting. For stricter limits, use
 * Vercel's built-in rate limiting or an external store like Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  /** Maximum number of requests per window */
  limit?: number;
  /** Window duration in seconds */
  windowSeconds?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { limit = 60, windowSeconds = 60 } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from request headers.
 * Works with Vercel's x-forwarded-for header.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
