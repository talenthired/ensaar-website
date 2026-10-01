import { afterEach, describe, expect, it } from 'vitest';
import { agreementToText, buildMasterAgreement, buildSchedule } from '@/lib/eor/agreement';
import { companyOutstandingEmail, employeeOutstandingEmail, invoiceIssuedEmail, schedulesReadyEmail, teamInviteEmail } from '@/lib/eor/email';
import { invoiceSettings } from '@/lib/eor/invoice-format';
import { invoicePdf } from '@/lib/eor/invoice-pdf';
import { canAddLateDocument, knownAs, validateCompany, validateEmployee } from '@/lib/eor/onboarding';
import { CLIENT_REMINDER, EMPLOYEE_REMINDER, companyOutstanding, employeeOutstanding, reminderSlot } from '@/lib/eor/outstanding';
import { ownershipText, validateOwnership } from '@/lib/eor/ownership';

const now = new Date('2026-10-01T06:00:00Z'); // Thursday, 11:30 in India, 02:00 in New York

const leena = {
  employeeName: 'Pulla Lakshmi',
  businessName: 'Leena Paul',
  employeeEmail: 'leena@example.com',
  jobTitle: 'Lead Recruiter',
  salaryInr: '1600000',
  startDate: '2026-10-01',
  workState: 'Telangana',
  pricing: 'loaded',
  loadedCostUsd: '1850',
};

const pristinno = {
  legalName: 'Pristinno Technology LLC',
  entityType: 'llc',
  ein: '42-5029561',
  addressLine1: '4 Old Meadow Ln',
  city: 'Canton',
  state: 'MA',
  zip: '02021',
  signatoryName: 'Ryan Archibald',
  signatoryEmail: 'ryan@example.com',
  confirmsSanctions: true,
  confirmsNoContracting: true,
};

describe('business name', () => {
  it('keeps the legal name for contracts and the business name for everything else', () => {
    const r = validateEmployee(leena, { now });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.employeeName).toBe('Pulla Lakshmi');
    expect(r.value.businessName).toBe('Leena Paul');
    expect(knownAs(r.value)).toBe('Leena Paul');
    const schedule = agreementToText(buildSchedule({ number: 1, companyName: 'Pristinno', company: null, masterHash: null, employee: r.value }));
    expect(schedule).toContain('Employee: Pulla Lakshmi (business name: Leena Paul)');
  });

  it('greets by the business name and shows the client both names on the Schedule A email', () => {
    expect(teamInviteEmail({ name: 'Leena Paul', companyName: 'Pristinno', reason: 'Your offer letter is ready.', link: 'https://x' }).subject).toMatch(/^Leena,/);
    const mail = schedulesReadyEmail({ name: 'Ryan Archibald', companyName: 'Pristinno', employees: [{ employeeName: 'Pulla Lakshmi', businessName: 'Leena Paul', jobTitle: 'Lead Recruiter', startDate: '2026-10-01' }] });
    expect(mail.subject).toBe('Leena Paul is ready for your signature');
    expect(mail.text).toContain('Leena Paul (legal name Pulla Lakshmi), Lead Recruiter');
  });

  it('drops a business name that is the same as the legal name', () => {
    const r = validateEmployee({ ...leena, businessName: 'Pulla Lakshmi' }, { now });
    expect(r.ok && r.value.businessName).toBe(null);
  });
});

describe('backdated starts', () => {
  it('lets staff record a start up to 90 days ago, and nobody else', () => {
    expect(validateEmployee({ ...leena, startDate: '2026-09-15' }, { now }).ok).toBe(false);
    expect(validateEmployee({ ...leena, startDate: '2026-09-15' }, { now, allowPastStart: true }).ok).toBe(true);
    expect(validateEmployee({ ...leena, startDate: '2026-06-01' }, { now, allowPastStart: true }).ok).toBe(false);
  });
});

describe('company details that can follow later', () => {
  it('accepts a company without title, billing email or state, and describes it without a state', () => {
    const r = validateCompany(pristinno);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.signatoryTitle).toBe(null);
    expect(r.value.billingEmail).toBe(null);
    expect(r.value.incorporationState).toBe(null);
    expect(buildMasterAgreement('Pristinno', r.value).parties[1]).toContain('a limited liability company (llc) organised in the United States');
  });

  it('lists what is still needed, in the order of the reminder', () => {
    const r = validateCompany(pristinno);
    if (!r.ok) throw new Error('invalid');
    const list = companyOutstanding({ details: r.value, documents: [], ownershipDeclared: false });
    expect(list.needed.map((n) => n.key)).toEqual(['signatory_title', 'billing_email', 'formation_state', 'formation', 'ownership']);
    expect(list.needed.find((n) => n.key === 'formation')!.label).toBe('Certificate of Organization');
    expect(list.received).toContain('EIN 42-5029561');
    const done = companyOutstanding({
      details: { ...r.value, signatoryTitle: 'CEO', billingEmail: 'ap@x.com', incorporationState: 'MA' },
      documents: [{ kind: 'formation', reviewStatus: 'pending' }],
      ownershipDeclared: true,
    });
    expect(done.needed).toEqual([]);
  });

  it('lets a client add a missing document after signing, not replace one', () => {
    expect(canAddLateDocument('formation', [])).toBe(true);
    expect(canAddLateDocument('formation', [{ kind: 'formation', reviewStatus: 'rejected' }])).toBe(true);
    expect(canAddLateDocument('formation', [{ kind: 'formation', reviewStatus: 'accepted' }])).toBe(false);
    expect(canAddLateDocument('other', [])).toBe(false);
  });
});

describe('reminders twice a week', () => {
  it('sends on Mondays and Thursdays after the morning hour in each time zone', () => {
    // Thursday 06:00 UTC: 11:30 in India (due), 02:00 in New York (not yet).
    expect(reminderSlot(now, EMPLOYEE_REMINDER)).toBe('2026-10-01');
    expect(reminderSlot(now, CLIENT_REMINDER)).toBe(null);
    expect(reminderSlot(new Date('2026-10-01T14:00:00Z'), CLIENT_REMINDER)).toBe('2026-10-01');
    // Wednesday and Friday: nothing.
    expect(reminderSlot(new Date('2026-09-30T14:00:00Z'), CLIENT_REMINDER)).toBe(null);
    expect(reminderSlot(new Date('2026-10-02T14:00:00Z'), EMPLOYEE_REMINDER)).toBe(null);
    // Monday.
    expect(reminderSlot(new Date('2026-10-05T14:00:00Z'), CLIENT_REMINDER)).toBe('2026-10-05');
  });

  it('asks the employee for the bank account and relieving letter until each arrives', () => {
    const base = { legalName: 'Pulla Lakshmi', hasBankDetails: false, hasBankProof: false, hasRelievingLetter: false, noPreviousEmployer: false, identityVerified: true };
    expect(employeeOutstanding(base).needed.map((n) => n.key)).toEqual(['bank', 'relieving_letter']);
    expect(employeeOutstanding({ ...base, hasBankDetails: true }).needed.map((n) => n.key)).toEqual(['bank_proof', 'relieving_letter']);
    expect(employeeOutstanding({ ...base, hasBankDetails: true, hasBankProof: true, noPreviousEmployer: true }).needed).toEqual([]);
    const mail = employeeOutstandingEmail({ name: 'Leena Paul', ...employeeOutstanding(base) });
    expect(mail.subject).toBe('Leena, two items still needed for your onboarding');
    expect(mail.text).toContain('We have your PAN and Aadhaar.');
    expect(mail.text).toContain('in your legal name, Pulla Lakshmi');
    expect(mail.text).toContain('every Monday and Thursday');
  });

  it('words the client reminder as previewed', () => {
    const r = validateCompany(pristinno);
    if (!r.ok) throw new Error('invalid');
    const mail = companyOutstandingEmail({ name: 'Ryan Archibald', companyName: 'Pristinno Technology LLC', ...companyOutstanding({ details: r.value, documents: [], ownershipDeclared: false }) });
    expect(mail.subject).toBe('Pristinno Technology LLC: five items still needed by Ensaar');
    expect(mail.text).toContain('Hi Ryan, a few items are still outstanding');
    expect(mail.text).toContain("before we run Pristinno Technology LLC's first payroll");
  });
});

describe('ownership declaration', () => {
  it('needs each owner of 25% or more, or a controller when there is none', () => {
    expect(validateOwnership({ owners: [] }).ok).toBe(false);
    expect(validateOwnership({ owners: [{ fullName: 'Ryan Archibald', dateOfBirth: '1980-02-03', country: 'United States', percent: '20' }] }).ok).toBe(false);
    const ok = validateOwnership({ owners: [{ fullName: 'Ryan Archibald', dateOfBirth: '1980-02-03', country: 'United States', percent: '100' }] });
    expect(ok.ok).toBe(true);
    expect(validateOwnership({ owners: [{ fullName: 'A Person', dateOfBirth: '1980-02-03', country: 'US', percent: '60' }, { fullName: 'B Person', dateOfBirth: '1981-02-03', country: 'US', percent: '60' }] }).ok).toBe(false);
    const none = validateOwnership({ noLargeOwner: true, controller: { fullName: 'Ryan Archibald', title: 'Managing Member' } });
    expect(none.ok).toBe(true);
    if (ok.ok) expect(ownershipText('Pristinno Technology LLC', ok.value, { name: 'Ryan Archibald', email: 'r@x.com' }, '2026-10-01')).toContain('- Ryan Archibald, born 1980-02-03, lives in United States, 100%');
  });
});

describe('invoices in Ensaar’s format', () => {
  const keys = ['INVOICE_BANK_ACCOUNT', 'INVOICE_BANK_IFSC', 'INVOICE_BANK_SWIFT', 'INVOICE_LUT_ARN', 'INVOICE_LUT_FY'];
  afterEach(() => keys.forEach((k) => delete process.env[k]));
  const configure = (swift = 'ICICINBBCTS') => {
    Object.assign(process.env, { INVOICE_BANK_ACCOUNT: '123456789012', INVOICE_BANK_IFSC: 'ICIC0000183', INVOICE_BANK_SWIFT: swift, INVOICE_LUT_ARN: 'AD3603260000001', INVOICE_LUT_FY: '2026-27' });
  };

  it('refuses to issue until bank details and this year’s LUT are set, and rejects a SWIFT code with spaces', () => {
    expect(invoiceSettings().ok).toBe(false);
    configure('ICICI NBB CTS');
    const bad = invoiceSettings();
    expect(!bad.ok && bad.missing.join(' ')).toContain('SWIFT');
    configure();
    expect(invoiceSettings().ok).toBe(true);
  });

  it('builds a one-page A4 PDF and says to pay by wire, not ACH', async () => {
    configure();
    const settings = invoiceSettings();
    if (!settings.ok) throw new Error('settings');
    const invoice = { number: 'PT-001', period: '2026-10', amountUsd: 1850, issuedOn: '2026-10-15', dueOn: '2026-10-22', summary: 'Leena Paul, Lead Recruiter' };
    const r = validateCompany(pristinno);
    const bytes = await invoicePdf({ invoice, customer: { name: 'Pristinno Technology LLC', details: r.ok ? r.value : null }, settings: settings.value });
    const head = Buffer.from(bytes.slice(0, 8)).toString('latin1');
    expect(head.startsWith('%PDF-')).toBe(true);
    expect(bytes.length).toBeGreaterThan(5_000);
    const mail = invoiceIssuedEmail({ companyName: 'Pristinno Technology LLC', invoice });
    expect(mail.text).toContain('by international wire');
    expect(mail.text).toContain('ACH is not available');
    expect(mail.text).toContain('SWIFT: ICICINBBCTS');
    expect(mail.text).toContain('accounts@ensaar.com');
  });
});

