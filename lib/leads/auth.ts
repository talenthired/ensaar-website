import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const PORTAL_COOKIE = 'ensaar_lead_portal';

function portalPassword() {
  if (process.env.LEAD_PORTAL_PASSWORD) return process.env.LEAD_PORTAL_PASSWORD;
  return process.env.NODE_ENV === 'development' ? 'ensaar-local' : '';
}

function portalSecret() {
  return process.env.LEAD_PORTAL_SECRET || portalPassword();
}

export function portalIsConfigured() {
  return Boolean(portalPassword() && portalSecret());
}

export function createPortalToken() {
  return createHmac('sha256', portalSecret()).update(portalPassword()).digest('hex');
}

export function verifyPortalPassword(value: string) {
  const expected = portalPassword();
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function verifyPortalToken(value?: string) {
  if (!value || !portalIsConfigured()) return false;
  const expected = createPortalToken();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
