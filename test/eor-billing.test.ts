import { describe, expect, it } from 'vitest';
import { agreementToText, buildMasterAgreement } from '@/lib/eor/agreement';
import {
  addDays,
  billingNow,
  daysOverdue,
  defaultInvoiceDates,
  lateInterestUsd,
  reminderStage,
  validateInvoice,
} from '@/lib/eor/billing';
import { invoiceIssuedEmail, invoicePaidEmail, invoiceReminderEmail } from '@/lib/eor/email';
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

describe('payment terms in the agreement', () => {
  const text = agreementToText(buildMasterAgreement('Pristinno Tech', null));

  it('invoices on the 15th, payable within 7 days', () => {
    expect(text).toContain('Ensaar will invoice in US dollars on the 15th of each month');
    expect(text).toContain('Each invoice is payable within 7 days of its date');
    expect(text).not.toContain('20th');
  });

  it('tells the customer that late payment delays their employees\' pay, and costs interest', () => {
    expect(text).toContain('is not obliged to advance or fund any Employment Cost');
    expect(text).toContain('until an invoice is paid in full the Employees\' salaries for that month cannot be paid');
    expect(text).toContain('carries interest at 1.5% per month, calculated daily from the due date');
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
    expect(mail.text).toContain('salaries for October 2026 cannot be paid until it is received');
    expect(mail.text).toContain('interest at 1.5% per month');
    expect(mail.text).toContain('Interest accrued so far: US$14.88');
    expect(mail.text).toContain('Amount: US$4,250.50');
  });

  it('a reminder before the due date names the date and why it matters', () => {
    const mail = invoiceReminderEmail({ companyName: 'Pristinno Tech Inc.', invoice, stage: { kind: 'upcoming', daysLate: 0 }, today: '2026-10-19' });
    expect(mail.subject).toBe('Reminder: invoice ENS-2026-101 for Pristinno Tech Inc. is due October 22, 2026');
    expect(mail.text).toContain('Invoice ENS-2026-101 is due in 3 days');
    expect(mail.text).toContain('Your employees in India are paid from this payment');
    expect(invoiceReminderEmail({ companyName: 'X', invoice, stage: { kind: 'due', daysLate: 0 }, today: '2026-10-22' }).subject).toContain('is due today');
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
    expect(mail.html).toContain('Ensaar Global Pvt. Ltd.');
    expect(mail.html).toContain('mailto:support@ensaar.com');
    expect(mail.text).toContain('Ensaar Global Pvt. Ltd., Hyderabad, Telangana, India');
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
