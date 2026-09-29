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
 * Use the Supabase RPC when it is configured so every serverless instance shares
 * one counter. When it is not, fall back to the in-memory limiter: this service
 * runs as a single web instance on Railway, so the local buckets count
 * accurately. Failing closed here (the previous behaviour) 429'd every lead,
 * support, login and certificate request in production the moment Supabase was
 * absent, silently shutting the primary conversion. If the service is ever
 * scaled past one instance, set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY so the
 * counter is shared; an unhealthy shared store still fails closed below.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!hasSupabase()) {
    return localRateLimit(key, limit, windowMs);
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
 * The caller's address, from headers only a proxy in front of this app can set.
 *
 * cf-connecting-ip and x-vercel-forwarded-for are only unforgeable when the app
 * really sits behind Cloudflare or Vercel. On any other host (Railway included)
 * they pass straight through from the caller: verified on production on
 * 2026-09-29, when rotating a made-up cf-connecting-ip reset the rate limit on
 * every request, which bypassed every limit on the site, the staff login
 * included, and let a signer forge the IP in their signature evidence. So each
 * is trusted only where the operator says that edge is real.
 *
 * x-forwarded-for is caller-supplied unless the proxy overwrites it.
 * TRUST_PROXY_IP=1 is the operator's assertion that it does. Railway's does:
 * rotating a forged x-forwarded-for on production did not reset the limit.
 * Outside production it is trusted so local testing works.
 */
export function clientIp(request: Request): string | null {
  const cloudflare = process.env.TRUST_CLOUDFLARE_IP === '1' ? request.headers.get('cf-connecting-ip') : null;
  const vercel = process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') : null;

  const trustForwardedFor = process.env.TRUST_PROXY_IP === '1' || process.env.NODE_ENV !== 'production';
  const forwarded = trustForwardedFor
    ? // Left-most entry is the originating client; the rest are proxy hops.
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
    : null;

  const ip = (cloudflare || vercel || forwarded || '').trim();
  return ip ? ip.slice(0, 64) : null;
}

/**
 * Derive a privacy-preserving client bucket from clientIp. Without a trusted
 * address every caller shares the "unknown" bucket, which fails safe (limits
 * still apply) at the cost of fairness; set TRUST_PROXY_IP=1 behind a proxy
 * that overwrites x-forwarded-for.
 */
export function clientKey(request: Request, scope: string): string {
  const ip = clientIp(request) || 'unknown';
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
