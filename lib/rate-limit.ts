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

/** Derive a privacy-preserving client bucket. Only proxy-owned identity headers count in production. */
export function clientKey(request: Request, scope: string): string {
  const proxyIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-vercel-forwarded-for');
  const developmentIp = process.env.NODE_ENV !== 'production'
    ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
    : undefined;
  const ip = proxyIp || developmentIp || 'unknown';
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
