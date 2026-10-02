import { describe, expect, it } from 'vitest';
import { NOTICE_DAYS, PROBATION_MONTHS } from '@/lib/eor/agreement';
import { PROVIDENT_FUND_TERMS } from '@/lib/eor/employment-docs';
import {
  ENCASHMENT_MAX_DAYS,
  HANDBOOK_CHANGES,
  HANDBOOK_VERSION,
  PTO_DAYS_PER_YEAR,
  buildHandbook,
  handbookToText,
} from '@/lib/eor/handbook';
import { employeeOutstanding } from '@/lib/eor/outstanding';

const text = (internalCommittee = false) => handbookToText(buildHandbook({ internalCommittee, issuedBy: 'Shanimole, Managing Director' }));

describe('Employee Handbook', () => {
  it('says what changed in this version', () => {
    expect(HANDBOOK_CHANGES[0]!.version).toBe(HANDBOOK_VERSION);
  });

  it('matches the employment agreement on notice, probation and pay day', () => {
    const t = text();
    expect(t).toContain(`${NOTICE_DAYS} days' written notice`);
    expect(t).toContain(`first ${PROBATION_MONTHS} months`);
    expect(t).toContain('no later than the 7th of the following month');
    expect(t).toContain('if anything in it differs from your employment agreement, the agreement applies');
  });

  it('states the leave numbers', () => {
    const t = text();
    expect(t).toContain(`${PTO_DAYS_PER_YEAR} days a calendar year`);
    expect(t).toContain(`up to ${ENCASHMENT_MAX_DAYS} unused paid leave days are paid out`);
    expect(t).toContain('Up to 26 weeks paid');
    expect(t).toContain('Sick leave is recorded, not refused');
  });

  it('keeps provident fund discretionary and never withholds wages', () => {
    const t = text();
    expect(t).toContain(PROVIDENT_FUND_TERMS);
    for (const re of [/withh(o|e)ld/i, /50% of (the|your)? ?salary/i, /cannot be paid/i, /not (to )?compete/i]) expect(t).not.toMatch(re);
  });

  it('names the right POSH committee for the headcount', () => {
    expect(text(false)).toContain('heard by the Local Committee of the district');
    expect(text(false)).not.toContain("Ensaar's Internal Committee under");
    expect(text(true)).toContain("heard by Ensaar's Internal Committee");
  });

  it('only Ensaar disciplines, after a chance to respond', () => {
    const t = text();
    expect(t).toContain('Only Ensaar takes disciplinary action, never the Client');
    expect(t).toContain('gives you a fair chance to respond in writing');
  });

  it('is issued in the signatory\'s name, never a staff email', () => {
    const t = text();
    expect(t).toContain('Issued for Ensaar by Shanimole, Managing Director.');
    expect(t).not.toMatch(/Gudipudi|rgudipudi/i);
  });

  it('asks the employee to acknowledge it until they do', () => {
    const base = { legalName: 'Pulla Lakshmi', hasBankDetails: true, hasBankProof: true, hasRelievingLetter: true, noPreviousEmployer: false, identityVerified: true };
    expect(employeeOutstanding({ ...base, handbookPending: HANDBOOK_VERSION }).needed.map((n) => n.key)).toEqual(['handbook']);
    expect(employeeOutstanding({ ...base, handbookPending: null }).needed).toEqual([]);
  });
});
