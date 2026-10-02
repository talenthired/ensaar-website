/**
 * Who an email is for, by its kind, and what Ensaar's own copy of it looks like.
 * Pure (no 'server-only'), so the rules are unit-tested on their own.
 *
 *   employee: sent from hr@ensaar.com, replies to hr@
 *   client:   sent from support@ensaar.com, replies to support@
 *   staff:    Ensaar's own notifications, which already go to the admins
 *
 * Employee emails are Cc'd in the open to HR and Ensaar's signatory (except the
 * sign-in link email). Client emails are copied to Ensaar's owners and admins as
 * a separate message, so the client never sees who else got it.
 */

export type Audience = 'employee' | 'client' | 'staff';

const EMPLOYEE_KINDS = new Set([
  'team.invite',
  'team.login',
  'team.document.signed',
  'team.handbook.published',
  'team.handbook.acknowledged',
  'team.leave.decided',
  'team.conduct.letter',
  'holidays.decided',
  'eor.outstanding.employee',
  'eor.outstanding.scheduled.employee',
]);

const CLIENT_KINDS = new Set([
  'portal.invite',
  'portal.login',
  'portal.sign_request',
  'eor.verify',
  'eor.master.signed.customer',
  'eor.company.approved',
  'eor.company.changes',
  'eor.schedules.ready',
  'eor.schedules.signed.customer',
  'eor.schedules.countersigned',
  'holidays.submitted',
  'portal.leave.requested',
  'portal.leave.recorded',
  'eor.outstanding.company',
  'eor.outstanding.scheduled.company',
  'invoice.issued',
  'invoice.upcoming',
  'invoice.due',
  'invoice.overdue',
  'invoice.paid',
]);

export function audienceOf(kind: string): Audience {
  if (EMPLOYEE_KINDS.has(kind)) return 'employee';
  if (CLIENT_KINDS.has(kind)) return 'client';
  return 'staff';
}

/**
 * Employee emails are Cc'd, openly, to HR and Ensaar's signatory, so HR's inbox
 * keeps a record. The one exception is the sign-in link email: a one-time link
 * works for whoever opens it, so it goes to the employee alone.
 */
export const EMPLOYEE_NOT_COPIED = new Set(['team.login']);

/**
 * A one-time sign-in link works for whoever opens it. Ensaar's copy points to
 * the ordinary sign-in page instead, so nobody at Ensaar can sign in, or sign,
 * as the client or the employee.
 */
const SIGN_IN_LINK = /(https?:\/\/[^\s"'<>]+?\/(portal|team))\/auth#[A-Za-z0-9_-]+/g;

export function withoutSignInLinks(body: string): string {
  return body.replace(SIGN_IN_LINK, '$1');
}

/** Ensaar's copy: marked as a copy, naming who it went to, with sign-in links neutralised. */
export function copyFor(message: { to: string[]; subject: string; text: string; html: string }): { subject: string; text: string; html: string } {
  const note = `Ensaar copy. This email was sent to ${message.to.join(', ')}. One-time sign-in links are removed from this copy.`;
  const banner = `<div style="background:#fff8eb;border-bottom:1px solid #f0d9a8;padding:10px 16px;font:600 12px/1.5 'Segoe UI',Arial,sans-serif;color:#7a4100">${note
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</div>`;
  const html = withoutSignInLinks(message.html);
  return {
    subject: `Copy: ${message.subject}`,
    text: `${note}\n\n${withoutSignInLinks(message.text)}`,
    html: /<body[^>]*>/.test(html) ? html.replace(/(<body[^>]*>)/, `$1${banner}`) : `${banner}${html}`,
  };
}
