import 'server-only';

import { NextResponse } from 'next/server';
import { BASECAMP_COOKIE, resolveBasecampSession, type BasecampSession } from './auth';
import { can, type Permission } from './roles';
import { siteConfig } from '@/lib/utils';

/**
 * The one place a Basecamp route decides whether the caller may proceed.
 *
 * Returns either the session or the response to return as-is, so a route reads
 * `const gate = await requireBasecamp(request, 'users:manage'); if (!gate.ok) return gate.response;`
 * and cannot forget the check by forgetting to compare a boolean.
 *
 * 401 for "not signed in" and 403 for "signed in but not allowed" are deliberate:
 * the panel is behind a login the caller already passed, so hiding the difference
 * buys nothing and makes a real permission bug look like a broken session.
 */
/**
 * SameSite=Strict stops other sites, but not other *subdomains* of ensaar.com,
 * which count as the same site. A changing request must therefore also come
 * from this exact origin. Browsers always send Origin on POST, PATCH and
 * DELETE, so a missing or foreign one is refused.
 */
export function sameOriginMutation(request: {
  method?: string;
  headers?: { get(name: string): string | null };
}): boolean {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const origin = request.headers?.get('origin');
  if (!origin) return false;
  // The request's own host (as the proxy forwarded it) or the canonical site host.
  const allowed = new Set(
    [request.headers?.get('x-forwarded-host'), request.headers?.get('host'), new URL(siteConfig.url).host].filter(
      (value): value is string => Boolean(value),
    ),
  );
  try {
    return allowed.has(new URL(origin).host);
  } catch {
    return false;
  }
}

export async function requireBasecamp(
  request: {
    method?: string;
    headers?: { get(name: string): string | null };
    cookies: { get(name: string): { value: string } | undefined };
  },
  permission?: Permission,
): Promise<{ ok: true; session: BasecampSession } | { ok: false; response: NextResponse }> {
  if (!sameOriginMutation(request)) {
    return { ok: false, response: NextResponse.json({ error: 'Cross-site request refused.' }, { status: 403 }) };
  }
  const session = await resolveBasecampSession(request.cookies.get(BASECAMP_COOKIE)?.value);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: 'Not signed in.' }, { status: 401 }) };
  }
  if (permission && !can(session.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You do not have access to that.' }, { status: 403 }),
    };
  }
  return { ok: true, session };
}
