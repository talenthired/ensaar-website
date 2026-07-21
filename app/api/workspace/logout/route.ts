import { NextResponse } from 'next/server';
import { PORTAL_COOKIE } from '@/lib/leads/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
