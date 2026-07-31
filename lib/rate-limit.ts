import 'server-only';

/**
 * Small fixed-window rate limiter for the handful of endpoints that accept
 * unauthenticated input: the Basecamp password form and the public lead form.
 *
 * SCOPE, stated plainly: this counts in the process's memory. On Vercel that is
 * per serverless instance, so a determined attacker spreading requests across
 * many cold instances can exceed the nominal rate. It still removes the cheap
 * attack that actually matters here - hammering one endpoint from one client to
 * brute-force a shared password or flood the leads table - and it costs no extra
 * service. If Basecamp ever holds more than a solo operator's lead list, move
 * this to a shared store (Upstash/Redis) and keep the same call sites.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets; use for Retry-After. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > limit) return { ok: false, remaining: 0, retryAfter };
  return { ok: true, remaining: limit - existing.count, retryAfter };
}

/**
 * Best-effort client identity. Behind Vercel the left-most x-forwarded-for entry
 * is the real client; fall back to a constant so a missing header degrades to a
 * shared bucket (limiting everyone) rather than to no limit at all.
 */
export function clientKey(request: Request, scope: string): string {
  const fwd = request.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}

/** Standard 429 body + headers. */
export function tooManyRequests(retryAfter: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(retryAfter),
      'cache-control': 'no-store',
    },
  });
}
