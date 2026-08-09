import 'server-only';

import { createHash } from 'node:crypto';

type Bucket = { count: number; resetAt: number };
const localBuckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number;
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of localBuckets) {
    if (bucket.resetAt <= now) localBuckets.delete(key);
  }
}

function localRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = localBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  existing.count += 1;
  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return existing.count > limit
    ? { ok: false, remaining: 0, retryAfter }
    : { ok: true, remaining: limit - existing.count, retryAfter };
}

/**
 * Use the Supabase RPC in deployed environments so every serverless instance
 * shares the same counter. A missing or unhealthy shared store fails closed in
 * production; development retains a local limiter for offline work.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!hasSupabase()) {
    return process.env.NODE_ENV === 'production'
      ? { ok: false, remaining: 0, retryAfter: 60 }
      : localRateLimit(key, limit, windowMs);
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/consume_ensaar_rate_limit`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: Math.ceil(windowMs / 1000) }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`rate-limit RPC failed: ${response.status}`);
    const data = (await response.json()) as Array<{ allowed: boolean; remaining: number; retry_after: number }>;
    const row = data[0];
    if (!row) throw new Error('rate-limit RPC returned no result');
    return { ok: row.allowed, remaining: row.remaining, retryAfter: row.retry_after };
  } catch {
    return { ok: false, remaining: 0, retryAfter: 60 };
  }
}

/**
 * Derive a privacy-preserving client bucket.
 *
 * cf-connecting-ip and x-vercel-forwarded-for are set by the proxy itself and a
 * client cannot forge them, so they are always trusted. Refusing to trust
 * anything else in production is deliberate: x-forwarded-for is caller-supplied
 * unless something upstream overwrites it, and trusting it blindly lets an
 * abuser rotate the header and skip the limit entirely.
 *
 * The cost of that stance is real on any host which is neither Cloudflare nor
 * Vercel: both headers are absent, every visitor hashes to "unknown", and the
 * whole site shares one bucket. At five lead submissions an hour that is five
 * leads an hour across all traffic, after which every genuine prospect is told
 * "Too many submissions" and the primary conversion is silently shut.
 *
 * TRUST_PROXY_IP=1 is how an operator resolves that, by asserting the app is
 * behind a proxy that overwrites the header. It is opt-in rather than inferred,
 * because getting it wrong in the permissive direction removes the protection
 * altogether and nothing visible changes.
 */
export function clientKey(request: Request, scope: string): string {
  const proxyIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-forwarded-for');

  /* x-forwarded-for is only as trustworthy as the hop that set it, so it counts
     only where the operator has said the app sits behind a proxy that
     overwrites it (TRUST_PROXY_IP=1), or outside production. Set it on Railway,
     Fly, Render or anything behind your own nginx. Do not set it if the app is
     reachable directly, or a caller can rotate the header and skip the limit
     entirely. */
  const trustForwardedFor = process.env.TRUST_PROXY_IP === '1' || process.env.NODE_ENV !== 'production';
  const forwarded = trustForwardedFor
    ? // Left-most entry is the originating client; the rest are proxy hops.
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
    : undefined;

  const ip = proxyIp || forwarded || 'unknown';
  const digest = createHash('sha256').update(ip).digest('hex');
  return `${scope}:${digest}`;
}

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
