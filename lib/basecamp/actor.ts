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

/**
 * Ensaar's authorised signatory (EOR_SIGNATORY_EMAIL): the one person whose
 * signature binds Ensaar. When set, only they can countersign a client's
 * agreement or Schedule A, or issue an employee's offer letter and employment
 * agreement, so only their name appears on what clients and employees receive.
 */
export function signatoryEmail(): string | null {
  return process.env.EOR_SIGNATORY_EMAIL?.trim().toLowerCase() || null;
}

export function requireSignatory(session: BasecampSession): NextResponse | null {
  const named = requireNamed(session);
  if (named) return named;
  const signatory = signatoryEmail();
  if (signatory && session.email?.toLowerCase() !== signatory) {
    return NextResponse.json({ error: `Only Ensaar's authorised signatory (${signatory}) can sign for Ensaar. Ask them to do this step.` }, { status: 403 });
  }
  return null;
}

/** The signatory's designation (EOR_SIGNATORY_TITLE), printed under their name. */
export function signatoryTitle(): string {
  return process.env.EOR_SIGNATORY_TITLE?.trim() || 'Authorised Signatory';
}

/** How Ensaar's signature reads wherever a client or employee sees it: name and designation, no email. */
export function signatoryLabel(session: BasecampSession): string {
  return `${session.name || session.email || 'Ensaar'}, ${signatoryTitle()}`;
}
