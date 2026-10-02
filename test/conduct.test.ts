import { describe, expect, it } from 'vitest';
import { canTerminate, conductLetterText } from '@/lib/eor/conduct';

const today = '2026-10-20';
const ev = (step: Parameters<typeof canTerminate>[0][number]['step'], extra: Partial<Parameters<typeof canTerminate>[0][number]> = {}) => ({
  step, issuedAt: '2026-10-10T00:00:00Z', responseDue: null, repliedAt: null, ...extra,
});

describe('corrective action', () => {
  it('does not allow ending employment without warning or a chance to reply', () => {
    expect(canTerminate([], today).ok).toBe(false);
    expect(canTerminate([ev('verbal_warning'), ev('written_warning')], today).ok).toBe(false);
  });

  it('allows it after a final written warning', () => {
    expect(canTerminate([ev('final_warning')], today)).toEqual({ ok: true });
  });

  it('allows it after a show-cause the employee answered, or let pass', () => {
    expect(canTerminate([ev('show_cause', { responseDue: '2026-10-25' })], today).ok).toBe(false);
    expect(canTerminate([ev('show_cause', { responseDue: '2026-10-25', repliedAt: '2026-10-21T00:00:00Z' })], today).ok).toBe(true);
    expect(canTerminate([ev('abandonment', { responseDue: '2026-10-19' })], today).ok).toBe(true);
  });

  const base = {
    employeeName: 'Pulla Lakshmi', employeeEmail: 'l@example.test', jobTitle: 'Lead Recruiter', companyName: 'Pristinno Technology LLC',
    issuedOn: '2026-10-20', details: 'Missed three client stand-ups without notice.', signatory: 'Shanimole, Managing Director',
  };

  it('writes a warning that says what must change and invites a reply', () => {
    const t = conductLetterText({ ...base, step: 'written_warning', expectation: 'Attend every stand-up or tell your manager beforehand.', dueDate: '2026-11-20' });
    expect(t).toContain('WRITTEN WARNING');
    expect(t).toContain('What needs to change: Attend every stand-up');
    expect(t).toContain('on or after November 20, 2026');
    expect(t).toContain('reply in the employee portal');
    expect(t).toContain('Shanimole, Managing Director');
  });

  it('asks for an explanation by a date before any decision', () => {
    const t = conductLetterText({ ...base, step: 'show_cause', dueDate: '2026-10-23' });
    expect(t).toContain('by October 23, 2026');
    expect(t).toContain('No decision has been made.');
  });

  it('suspends on full pay, never without pay', () => {
    const t = conductLetterText({ ...base, step: 'suspension' });
    expect(t).toContain('on full pay');
    expect(t).not.toMatch(/without pay|unpaid/i);
  });

  it('pays the final settlement in a termination letter', () => {
    const t = conductLetterText({ ...base, step: 'termination', basis: 'pay_in_lieu', lastDay: '2026-10-31' });
    expect(t).toContain('paid in place of your notice period');
    expect(t).toContain('within two working days');
    expect(t).not.toMatch(/withh(o|e)ld/i);
  });
});
