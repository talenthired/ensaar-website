import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { audienceOf, copyFor, withoutSignInLinks } from '@/lib/notify/audience';
import { employeeOutstandingEmail, signRequestEmail, teamInviteEmail } from '@/lib/eor/email';

/** Every outbox kind written anywhere in lib/, so a new email cannot ship unclassified. */
function kindsInCode(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => readdirSync(dir).forEach((f) => { const p = path.join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); });
  walk(path.resolve(__dirname, '..', 'lib'));
  const kinds = new Set<string>();
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/kind: (?:scheduled \? )?'([a-z]+(?:\.[a-z_]+)+)'(?: : '([a-z.]+)')?/g)) { kinds.add(m[1]!); if (m[2]) kinds.add(m[2]); }
  return [...kinds];
}

describe('who an email is for', () => {
  it('routes employee emails to HR, client emails to support, and leaves staff notifications alone', () => {
    expect(audienceOf('team.invite')).toBe('employee');
    expect(audienceOf('eor.outstanding.scheduled.employee')).toBe('employee');
    expect(audienceOf('portal.sign_request')).toBe('client');
    expect(audienceOf('invoice.overdue')).toBe('client');
    expect(audienceOf('invoice.overdue.staff')).toBe('staff');
    expect(audienceOf('eor.master.signed.staff')).toBe('staff');
    expect(audienceOf('lead.new')).toBe('staff');
  });

  it('classifies every email kind in the code', () => {
    const staffOnly = new Set(['eor.master.signed.staff', 'eor.schedules.signed.staff', 'team.document.signed.staff', 'invoice.overdue.staff', 'lead.new']);
    const unclassified = kindsInCode().filter((k) => audienceOf(k) === 'staff' && !staffOnly.has(k));
    expect(unclassified).toEqual([]);
  });

  it('tells employees to write to HR', () => {
    const mail = teamInviteEmail({ name: 'Leena Paul', companyName: 'Pristinno', reason: 'Your offer letter is ready.', link: 'https://ensaar.com/team/auth#abc' });
    expect(mail.text).toContain('Questions? Write to hr@ensaar.com');
    expect(mail.html).toContain('mailto:hr@ensaar.com');
    expect(mail.html).not.toContain('support@ensaar.com');
    const reminder = employeeOutstandingEmail({ name: 'Leena Paul', received: [], needed: [{ key: 'bank', label: 'Bank account', detail: 'x' }] });
    expect(reminder.text).toContain('hr@ensaar.com');
    expect(reminder.text).not.toContain('support@ensaar.com');
  });
});

describe("Ensaar's copy", () => {
  it('is marked as a copy and keeps no working sign-in link', () => {
    const link = 'https://ensaar.com/portal/auth#AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';
    const mail = signRequestEmail({ name: 'Ryan Archibald', companyName: 'Pristinno Technology LLC', link, assisted: true });
    const copy = copyFor({ to: ['ryan@pristinnotech.com'], ...mail });
    expect(copy.subject).toBe(`Copy: ${mail.subject}`);
    expect(copy.text).toContain('This email was sent to ryan@pristinnotech.com');
    expect(copy.text).not.toContain('#AbCd');
    expect(copy.html).not.toContain('#AbCd');
    expect(copy.html).toContain('https://ensaar.com/portal"');
    expect(mail.html).toContain('#AbCd');
    expect(withoutSignInLinks('https://ensaar.com/team/auth#xyz_-1 then')).toBe('https://ensaar.com/team then');
  });
});
