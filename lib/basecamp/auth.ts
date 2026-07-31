import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const BASECAMP_COOKIE = 'ensaar_basecamp';

/**
 * Basecamp is the private administration panel. Access is a single shared password
 * held in the environment; the cookie carries an HMAC of it rather than the password
 * itself, so a leaked cookie cannot be replayed against a rotated secret.
 *
 * LEAD_PORTAL_* are the original names from the lead workspace this panel replaced.
 * They stay supported so an existing deployment keeps working without an env change.
 */
function basecampPassword() {
  const configured = process.env.BASECAMP_PASSWORD || process.env.LEAD_PORTAL_PASSWORD;
  if (configured) return configured;
  return process.env.NODE_ENV === 'development' ? 'ensaar-local' : '';
}

function basecampSecret() {
  return process.env.BASECAMP_SECRET || process.env.LEAD_PORTAL_SECRET || basecampPassword();
}

export function basecampIsConfigured() {
  return Boolean(basecampPassword() && basecampSecret());
}

export function createBasecampToken() {
  return createHmac('sha256', basecampSecret()).update(basecampPassword()).digest('hex');
}

export function verifyBasecampPassword(value: string) {
  const expected = basecampPassword();
  if (!expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function verifyBasecampToken(value?: string) {
  if (!value || !basecampIsConfigured()) return false;
  const expected = createBasecampToken();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
