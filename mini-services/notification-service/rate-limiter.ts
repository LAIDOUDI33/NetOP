// ══════════════════════════════════════════════════════════════════════════════
// NetOptima Algérie — Rate Limiter (per-recipient, sliding window)
// ══════════════════════════════════════════════════════════════════════════════

// ─── Configuration ──────────────────────────────────────────────────────────

/** Max notifications per recipient per window */
const MAX_NOTIFICATIONS_PER_MINUTE = 100;
const WINDOW_MS = 60_000; // 1 minute sliding window

// ─── Sliding Window Store ───────────────────────────────────────────────────

/** Map of recipient -> array of timestamps */
const rateLimitStore = new Map<string, number[]>();

/** Clean up old entries periodically */
const CLEANUP_INTERVAL_MS = 30_000;

// ─── Core Logic ─────────────────────────────────────────────────────────────

/**
 * Check if a notification is allowed under the rate limit.
 * Returns { allowed: true } if ok, or { allowed: false, retryAfterMs, limit, remaining }
 * if rate-limited.
 */
export function checkRateLimit(recipient: string): {
  allowed: boolean;
  retryAfterMs?: number;
  limit: number;
  remaining: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get or create timestamp array for this recipient
  let timestamps = rateLimitStore.get(recipient);
  if (!timestamps) {
    timestamps = [];
    rateLimitStore.set(recipient, timestamps);
  }

  // Filter out timestamps outside the sliding window
  // (in-place filter for efficiency)
  let writeIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] > windowStart) {
      timestamps[writeIdx++] = timestamps[i];
    }
  }
  timestamps.length = writeIdx;

  const count = timestamps.length;

  if (count >= MAX_NOTIFICATIONS_PER_MINUTE) {
    // Rate limited — calculate when the oldest entry in window will expire
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + WINDOW_MS - now + 1;

    return {
      allowed: false,
      retryAfterMs,
      limit: MAX_NOTIFICATIONS_PER_MINUTE,
      remaining: 0,
    };
  }

  // Record this attempt
  timestamps.push(now);

  return {
    allowed: true,
    limit: MAX_NOTIFICATIONS_PER_MINUTE,
    remaining: MAX_NOTIFICATIONS_PER_MINUTE - count - 1,
  };
}

/**
 * Record a notification send (call after successful dispatch).
 * This is already handled in checkRateLimit, but exposed for explicit use.
 */
export function recordNotification(recipient: string): void {
  const timestamps = rateLimitStore.get(recipient);
  if (timestamps) {
    timestamps.push(Date.now());
  }
}

/** Get rate limit info for a recipient (without consuming a slot) */
export function getRateLimitInfo(recipient: string): {
  limit: number;
  remaining: number;
  resetAt: string | null;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = rateLimitStore.get(recipient);
  if (!timestamps) {
    return {
      limit: MAX_NOTIFICATIONS_PER_MINUTE,
      remaining: MAX_NOTIFICATIONS_PER_MINUTE,
      resetAt: null,
    };
  }

  const count = timestamps.filter(t => t > windowStart).length;

  return {
    limit: MAX_NOTIFICATIONS_PER_MINUTE,
    remaining: Math.max(0, MAX_NOTIFICATIONS_PER_MINUTE - count),
    resetAt: count > 0
      ? new Date(timestamps[0] + WINDOW_MS).toISOString()
      : null,
  };
}

/** Get all rate limit entries (for admin/debug) */
export function getRateLimitStats(): {
  trackedRecipients: number;
  totalRequests: number;
} {
  let totalRequests = 0;
  for (const timestamps of rateLimitStore.values()) {
    totalRequests += timestamps.length;
  }
  return {
    trackedRecipients: rateLimitStore.size,
    totalRequests,
  };
}

// ─── Periodic Cleanup ───────────────────────────────────────────────────────

function cleanupRateLimitStore() {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  let removed = 0;

  for (const [recipient, timestamps] of rateLimitStore.entries()) {
    // Filter to only current window entries
    const filtered = timestamps.filter(t => t > windowStart);
    if (filtered.length === 0) {
      rateLimitStore.delete(recipient);
      removed++;
    } else if (filtered.length < timestamps.length) {
      rateLimitStore.set(recipient, filtered);
    }
  }

  if (removed > 0) {
    console.log(`[RateLimiter] Cleaned up ${removed} stale recipient(s) | remaining: ${rateLimitStore.size}`);
  }
}

setInterval(cleanupRateLimitStore, CLEANUP_INTERVAL_MS);
console.log(`[RateLimiter] Initialized: ${MAX_NOTIFICATIONS_PER_MINUTE} notifications/minute/recipient`);
