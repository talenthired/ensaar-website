import { describe, expect, it } from 'vitest';
import { agreementToText, buildMasterAgreement, buildSchedule } from '@/lib/eor/agreement';
import { employeeSteps, validateEmployee } from '@/lib/eor/onboarding';
import {
  addDays,
  billingNow,
  daysOverdue,
  defaultInvoiceDates,
  lateInterestUsd,
  reminderStage,
  validateInvoice,
} from '@/lib/eor/billing';
import { invoiceIssuedEmail, invoiceOverdueStaffEmail, invoicePaidEmail, invoiceReminderEmail } from '@/lib/eor/email';
import { renderEmail } from '@/lib/notify/outbox';

const invoice = {
  number: 'ENS-2026-101',
  period: '2026-10',
  amountUsd: 4250.5,
  issuedOn: '2026-10-15',
  dueOn: '2026-10-22',
  summary: '3 employees',
  status: 'open' as const,
};

// Ensaar is the employer: wages are due on time whatever the customer does. Nothing we send may say otherwise.
const WITHHOLDING = [/cannot be paid/i, /remain unpaid/i, /not advance/i, /delays? (its|their|your) employees/i, /salaries? .*(on hold|wait|withh)/i, /(salar|wage)[^.]*until (it|the invoice|this invoice) is (paid|received|settled)/i];

describe('payment terms in the agreement', () => {
  const text = agreementToText(buildMasterAgreement('Pristinno Tech', null));

  it('invoices on the 15th, payable within 7 days', () => {
    expect(text).toContain('Ensaar will invoice in US dollars on the 15th of each month');
    expect(text).toContain('Each invoice is payable within 7 days of its date');
    expect(text).not.toContain('20th');
  });

  it('makes late payment the customer\'s cost: interest, no new hires, termination, indemnity', () => {
    expect(text).toContain('Ensaar is not obliged to extend credit to the Customer');
    expect(text).toContain('carries interest at 1.5% per month, calculated daily from the due date');
    expect(text).toContain('may decline to take on new Employees, and may end this agreement');
    expect(text).toContain('any amount Ensaar pays to meet its obligations as the Employees\' employer');
  });

  it('never says an employee\'s pay waits for the customer', () => {
    for (const phrase of WITHHOLDING) expect(text).not.toMatch(phrase);
  });
});

describe('deposit, notice, dismissal and revisions in the agreement', () => {
  const text = agreementToText(buildMasterAgreement('Pristinno Tech', null));

  it('always provides for a refundable one-month deposit, required at Ensaar\'s discretion', () => {
    expect(text).toContain('The Customer pays Ensaar a refundable deposit for an Employee, equal to one month\'s estimated Monthly Charges for that Employee (the "Deposit"), whenever Ensaar requires one');
    expect(text).toContain('Whether to require a Deposit, and for which Employees, is at Ensaar\'s discretion');
    expect(text).toContain('either in the Employee\'s Schedule A, in which case it is payable before that Employee\'s start date');
    expect(text).toContain('or later by written notice, in which case it is payable within 7 days of the notice');
    expect(text).toContain('Ensaar refunds the Deposit, less anything the Customer owes');
  });

  it('each Schedule A says whether a deposit is required, and the checklist asks for it only then', () => {
    const employee = (deposit: boolean) => ({
      employeeName: 'Ravi Kumar', employeeEmail: null, jobTitle: 'Engineer', salaryInr: 4_800_000, startDate: '2026-11-02', workState: 'Karnataka',
      pricing: 'fee' as const, monthlyFeeUsd: 249, loadedCostUsd: null, depositRequired: deposit, notes: null,
    });
    const schedule = (deposit: boolean) => agreementToText(buildSchedule({ number: 1, companyName: 'X', company: null, masterHash: null, employee: employee(deposit) }));
    expect(schedule(true)).toContain("Deposit: Required: one month's Monthly Charges, refundable (clause 4)");
    expect(schedule(false)).toContain('Deposit: Not required at signing (clause 4)');
    expect(employeeSteps({ depositRequired: true }).map((s) => s.key)).toContain('deposit');
    expect(employeeSteps({ depositRequired: false }).map((s) => s.key)).not.toContain('deposit');
    expect(employeeSteps({ depositRequired: false })).toHaveLength(employeeSteps({ depositRequired: true }).length - 1);
  });

  it('a deposit is off unless chosen, and a spreadsheet can ask for it', () => {
    const base = { employeeName: 'Ravi Kumar', jobTitle: 'Engineer', salaryInr: '4800000', startDate: '2026-11-02', workState: 'Karnataka', monthlyFeeUsd: '249' };
    const now = { now: new Date('2026-10-01T00:00:00Z') };
    const read = (extra: Record<string, unknown>) => (validateEmployee({ ...base, ...extra }, now) as { ok: true; value: { depositRequired: boolean } }).value.depositRequired;
    expect(read({})).toBe(false);
    expect(read({ depositRequired: '' })).toBe(false);
    expect(read({ depositRequired: 'No' })).toBe(false);
    for (const yes of ['yes', 'Yes', 'Y', 'true', '1', 'required', true]) expect(read({ depositRequired: yes }), String(yes)).toBe(true);
  });

  it('gives 30 days\' notice on either side, or payment in lieu from the customer', () => {
    expect(text).toContain('Either party may end this agreement, or the arrangement for any one Employee, on 30 days\' written notice');
    expect(text).toContain('it pays in lieu of notice the Monthly Charges for the rest of the 30 days');
  });

  it('has the customer notify Ensaar instead of dismissing anyone itself', () => {
    expect(text).toContain('Only Ensaar, as employer, may discipline, suspend or dismiss an Employee');
    expect(text).toContain('will not tell an Employee that their employment is ending');
    expect(text).toContain('it will notify Ensaar in writing promptly');
    expect(text).toContain('an improvement period of at least 30 days');
    expect(text).toContain('where serious misconduct is proven, Ensaar may dismiss without notice');
  });

  it('can be revised on notice, with a way out for a customer who does not agree', () => {
    expect(text).toContain('Ensaar may revise this agreement from time to time');
    expect(text).toContain('at least 30 days before it takes effect');
    expect(text).toContain('it may end this agreement by written notice given before that date');
  });
});

describe('invoice dates', () => {
  it('defaults to the 15th of the current month, due 7 days later', () => {
    expect(defaultInvoiceDates('2026-10-03')).toEqual({ issuedOn: '2026-10-15', dueOn: '2026-10-22', period: '2026-10' });
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('reads today in the customers\' time zone, not the server\'s', () => {
    // 02:30 UTC on the 23rd is still the evening of the 22nd in New York.
    expect(billingNow(new Date('2026-10-23T02:30:00Z'))).toEqual({ today: '2026-10-22', hour: 22 });
    expect(billingNow(new Date('2026-10-22T13:05:00Z'))).toEqual({ today: '2026-10-22', hour: 9 });
  });
});

describe('reminders', () => {
  const stage = (today: string, over: Partial<typeof invoice> = {}) => reminderStage({ ...invoice, ...over }, today)?.key ?? null;

  it('reminds three days before, on the due date, then 1, 3 and 7 days late and weekly', () => {
    expect(stage('2026-10-18')).toBeNull();
    expect(stage('2026-10-19')).toBe('upcoming');
    expect(stage('2026-10-21')).toBe('upcoming');
    expect(stage('2026-10-22')).toBe('due');
    expect(stage('2026-10-23')).toBe('overdue-1');
    expect(stage('2026-10-24')).toBe('overdue-1');
    expect(stage('2026-10-25')).toBe('overdue-3');
    expect(stage('2026-10-29')).toBe('overdue-7');
    expect(stage('2026-11-04')).toBe('overdue-7');
    expect(stage('2026-11-05')).toBe('overdue-14');
    expect(stage('2026-11-12')).toBe('overdue-21');
  });

  it('stops once paid or void, and after ninety days', () => {
    expect(stage('2026-10-25', { status: 'paid' as never })).toBeNull();
    expect(stage('2026-10-25', { status: 'void' as never })).toBeNull();
    expect(stage('2027-01-20')).toBe('overdue-84');
    expect(stage('2027-01-21')).toBeNull();
  });

  it('does not send "due soon" the day after announcing an invoice issued close to its due date', () => {
    expect(stage('2026-10-21', { issuedOn: '2026-10-20' })).toBeNull();
    expect(stage('2026-10-22', { issuedOn: '2026-10-20' })).toBe('due');
  });

  it('charges 1.5% a month on the overdue amount, by the day', () => {
    expect(lateInterestUsd(10_000, 30)).toBe(150);
    expect(lateInterestUsd(10_000, 1)).toBe(5);
    expect(lateInterestUsd(4250.5, 7)).toBe(14.88);
    expect(lateInterestUsd(10_000, 0)).toBe(0);
    expect(daysOverdue(invoice, '2026-10-25')).toBe(3);
    expect(daysOverdue({ ...invoice, status: 'paid' }, '2026-10-25')).toBe(0);
  });
});

describe('validateInvoice', () => {
  const input = { number: ' ENS-2026-101 ', period: '2026-10', amountUsd: '$4,250.10', issuedOn: '2026-10-15', dueOn: '2026-10-22', summary: '' };

  it('accepts an amount with cents and tidies the rest', () => {
    const result = validateInvoice(input);
    expect(result).toEqual({ ok: true, value: { number: 'ENS-2026-101', period: '2026-10', amountUsd: 4250.1, issuedOn: '2026-10-15', dueOn: '2026-10-22', summary: null } });
  });

  it('refuses a missing number, a bad amount, and a due date before the invoice date', () => {
    const result = validateInvoice({ ...input, number: '', amountUsd: '12.345', dueOn: '2026-10-01', period: '2026-13' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['amountUsd', 'dueOn', 'number', 'period']);
    expect(validateInvoice({ ...input, issuedOn: '2026-02-30' }).ok).toBe(false);
  });
});

describe('billing emails', () => {
  it('an overdue notice says how late, that salaries wait, and the interest so far', () => {
    const mail = invoiceReminderEmail({ companyName: 'Pristinno Tech Inc.', invoice, stage: { kind: 'overdue', daysLate: 7 }, today: '2026-10-29' });
    expect(mail.subject).toBe('Overdue: invoice ENS-2026-101 for Pristinno Tech Inc. is 7 days late');
    expect(mail.text).toContain('Interest is accruing, and continued non-payment puts your service with Ensaar at risk');
    expect(mail.text).toContain('may decline to take on new employees and may end the arrangement');
    expect(mail.text).toContain('interest at 1.5% per month');
    expect(mail.text).toContain('Interest accrued so far: US$14.88');
    expect(mail.text).toContain('Amount: US$4,250.50');
  });

  it('a reminder before the due date names the date and why it matters', () => {
    const mail = invoiceReminderEmail({ companyName: 'Pristinno Tech Inc.', invoice, stage: { kind: 'upcoming', daysLate: 0 }, today: '2026-10-19' });
    expect(mail.subject).toBe('Reminder: invoice ENS-2026-101 for Pristinno Tech Inc. is due October 22, 2026');
    expect(mail.text).toContain('Invoice ENS-2026-101 is due in 3 days');
    expect(mail.text).toContain('Your payment funds the salaries and statutory dues of your employees in India');
    expect(invoiceReminderEmail({ companyName: 'X', invoice, stage: { kind: 'due', daysLate: 0 }, today: '2026-10-22' }).subject).toContain('is due today');
  });

  it('no billing email says an employee\'s pay waits for the customer', () => {
    const all = [
      invoiceIssuedEmail({ companyName: 'X', invoice }),
      invoicePaidEmail({ companyName: 'X', invoice, paidOn: '2026-10-20' }),
      invoiceOverdueStaffEmail({ companyName: 'X', companyId: 'c', invoice }),
      ...(['upcoming', 'due', 'overdue'] as const).map((kind) => invoiceReminderEmail({ companyName: 'X', invoice, stage: { kind, daysLate: kind === 'overdue' ? 7 : 0 }, today: '2026-10-19' })),
    ];
    for (const mail of all) for (const phrase of WITHHOLDING) expect(mail.text, mail.subject).not.toMatch(phrase);
  });

  it('issued and paid emails carry the invoice facts', () => {
    expect(invoiceIssuedEmail({ companyName: 'Pristinno Tech Inc.', invoice }).text).toContain('payable by bank transfer within 7 days');
    expect(invoicePaidEmail({ companyName: 'Pristinno Tech Inc.', invoice, paidOn: '2026-10-20' }).text).toContain('Received: October 20, 2026');
  });
});

describe('the email layout', () => {
  const mail = renderEmail({
    eyebrow: 'Billing',
    heading: 'A <heading>',
    notice: { tone: 'danger', text: 'Overdue & unpaid' },
    paragraphs: ['First "paragraph"'],
    facts: [{ label: 'Amount', value: 'US$1.00' }],
    action: { label: 'Open', href: 'https://ensaar.com/portal?tab=billing&x=1' },
  });

  it('carries the Ensaar logo, the company name and the support address', () => {
    expect(mail.html).toContain('src="https://ensaar.com/ensaar-logo.png"');
    expect(mail.html).toContain('alt="Ensaar Global"');
    expect(mail.html).toContain('Ensaar Global Private Limited');
    expect(mail.html).toContain('GSTIN 36AAECE2158G1ZS');
    expect(mail.html).toContain('mailto:support@ensaar.com');
    expect(mail.text).toContain('Ensaar Global Private Limited, Second Floor, H.No 16-11-20/G/204, Bhavani Apartments, Saleem Nagar, Malakpet, Hyderabad, Telangana 500036, India. GSTIN 36AAECE2158G1ZS');
  });

  it('escapes everything a caller passes in', () => {
    expect(mail.html).toContain('A &lt;heading&gt;');
    expect(mail.html).toContain('Overdue &amp; unpaid');
    expect(mail.html).toContain('First &quot;paragraph&quot;');
    expect(mail.html).toContain('href="https://ensaar.com/portal?tab=billing&amp;x=1"');
    expect(mail.html).not.toContain('<heading>');
  });

  it('has a plain-text version with the same facts', () => {
    expect(mail.text).toContain('Overdue & unpaid');
    expect(mail.text).toContain('Amount: US$1.00');
    expect(mail.text).toContain('Open: https://ensaar.com/portal?tab=billing&x=1');
  });
});
