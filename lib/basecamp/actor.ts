import 'server-only';

import { NextResponse } from 'next/server';
import type { BasecampSession } from './auth';

/** How a Basecamp user is named on signatures, reviews and checklists. */
export function actorName(session: BasecampSession): string {
  return session.name ? `${session.name} (${session.email})` : session.email ?? 'shared login';
}

/**
 * Anything that binds Ensaar or decides for a customer must be attributable to
 * a person, so the shared-password login cannot do it.
 */
export function requireNamed(session: BasecampSession): NextResponse | null {
  if (session.bootstrap || !session.email) {
    return NextResponse.json({ error: 'Sign in with your own Basecamp account for this. The shared login cannot.' }, { status: 403 });
  }
  return null;
}
