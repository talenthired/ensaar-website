import { NextRequest, NextResponse } from 'next/server';
import {
  PORTAL_COOKIE,
  createPortalToken,
  portalIsConfigured,
  verifyPortalPassword,
} from '@/lib/leads/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { password?: string };
  if (!portalIsConfigured()) {
    return NextResponse.json({ error: 'Lead portal access is not configured.' }, { status: 503 });
  }
  if (!verifyPortalPassword(body.password || '')) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE, createPortalToken(), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
