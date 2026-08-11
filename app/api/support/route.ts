import { NextRequest, NextResponse } from 'next/server';
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 40;
const WINDOW_MS = 60 * 60 * 1000;

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const limit = await rateLimit(clientKey(request, 'support-chat'), MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many chat requests. Please try again shortly.');

  const secret = process.env.SUPPORT_BRIDGE_SECRET?.trim();
  const endpoint = process.env.DAILYBYTE_SUPPORT_API_URL?.trim()
    || (process.env.NODE_ENV === 'production'
      ? 'https://dailybytepro.com/api/support/bridge'
      : 'http://localhost:3010/api/support/bridge');
  if (!secret) return NextResponse.json({ error: 'Live support is temporarily unavailable.' }, { status: 503 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  const action = clean(body.action, 10);
  const payload = action === 'create'
    ? {
        action,
        name: clean(body.name, 120),
        email: clean(body.email, 254).toLowerCase(),
        category: clean(body.category, 30),
        subject: clean(body.subject, 120),
        body: clean(body.body, 4000),
      }
    : action === 'sync'
      ? { action, threadId: clean(body.threadId, 40), token: clean(body.token, 100) }
      : action === 'send'
        ? { action, threadId: clean(body.threadId, 40), token: clean(body.token, 100), body: clean(body.body, 4000) }
        : null;
  if (!payload) return NextResponse.json({ error: 'Invalid support action.' }, { status: 400 });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-support-bridge-secret': secret },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json().catch(() => ({ error: 'Support service returned an invalid response.' }));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Live support is temporarily unavailable.' }, { status: 503 });
  }
}
