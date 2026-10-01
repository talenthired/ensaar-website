import 'server-only';

import { hrAddress, renderEmail, supportAddress } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';
import {
  LATE_INTEREST_PERCENT_PER_MONTH,
  PAYMENT_DAYS,
  daysBetween,
  formatPeriod,
  formatUsdExact,
  lateInterestUsd,
  type Invoice,
  type ReminderStage,
} from './billing';
import { formatDay, INVITE_LINK_TTL_DAYS, knownAs, LOGIN_LINK_TTL_MINUTES } from './onboarding';
import { itemCount, type Outstanding } from './outstanding';
import { INVOICE_ISSUER, PAYMENT_METHOD_LINE, invoiceSettings } from './invoice-format';

type Named = { employeeName: string; businessName?: string | null };
/** How the client sees an employee where it matters which person is meant: business name, then the legal name. */
const withLegalName = (e: Named) => (e.businessName ? `${e.businessName} (legal name ${e.employeeName})` : e.employeeName);

function siteUrl() {
  return siteConfig.url.replace(/\/+$/, '');
}

/**
 * A one-time sign-in link. The token goes in the fragment: never sent to a
 * server, a log or a Referer.
 */
export function portalAuthLink(token: string): string {
  return `${siteUrl()}/portal/auth#${token}`;
}

export function portalUrl(path = ''): string {
  return `${siteUrl()}/portal${path}`;
}

const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || 'there';

type Mail = { subject: string; text: string; html: string };

export function portalInviteEmail(input: { name: string | null; companyName: string; link: string; signatory: boolean }): Mail {
  return {
    subject: input.signatory
      ? `You are the signatory for ${input.companyName} on Ensaar`
      : `Set up ${input.companyName} on Ensaar`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Hi ${firstName(input.name)}, welcome to Ensaar`,
      paragraphs: input.signatory
        ? [
            `${input.companyName} named you as the person who signs its Employer of Record agreement and each employee's Schedule A.`,
            'Sign in to review and sign. The portal is also where you see every employee Ensaar employs for you, and their onboarding.',
          ]
        : [
            `Ensaar is ready to employ people in India for ${input.companyName}.`,
            'Sign in to add your company details and two documents, name who signs for the company, and follow each employee from offer to first day.',
          ],
      action: { label: 'Sign in to the portal', href: input.link },
      footer: `The link works once and expires in ${INVITE_LINK_TTL_DAYS} days. After that, sign in at ${portalUrl()} with this email address. Questions? Write to ${supportAddress()}.`,
    }),
  };
}

/**
 * Asks the signatory to review and sign once details and documents are in.
 * `assisted` is true when Ensaar entered the details for the customer: the
 * email says so, because the signatory is about to vouch for them.
 */
export function signRequestEmail(input: { name: string | null; companyName: string; link: string; assisted: boolean }): Mail {
  return {
    subject: `${input.companyName}: your Ensaar agreement is ready to sign`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Hi ${firstName(input.name)}, your agreement is ready to sign`,
      paragraphs: [
        input.assisted
          ? `To save you time, Ensaar has entered ${input.companyName}'s company details and uploaded its documents, from what you gave us.`
          : `${input.companyName}'s company details and documents are in.`,
        `All that is left is for you to ${input.assisted ? 'check them and sign' : 'review and sign'} the Employer of Record agreement. It takes about two minutes, and you can correct anything that is wrong before you sign.`,
      ],
      action: { label: 'Review and sign', href: input.link },
      footer: `The link works once and expires in ${INVITE_LINK_TTL_DAYS} days. After that, sign in at ${portalUrl()} with this email address. Questions? Write to ${supportAddress()}.`,
    }),
  };
}

export function loginEmail(input: { name: string | null; companyName: string; link: string }): Mail {
  return {
    subject: `Your Ensaar sign-in link for ${input.companyName}`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Hi ${firstName(input.name)}, here is your sign-in link`,
      paragraphs: [`Use this link to sign in to ${input.companyName}'s portal. It works once and expires in ${LOGIN_LINK_TTL_MINUTES} minutes.`],
      action: { label: 'Sign in', href: input.link },
      footer: `If you did not ask to sign in, you can ignore this email. Questions? Write to ${supportAddress()}.`,
    }),
  };
}

export function schedulesReadyEmail(input: {
  name: string | null;
  companyName: string;
  employees: Array<Named & { jobTitle: string; startDate: string }>;
  reason?: string;
}): Mail {
  const n = input.employees.length;
  const listed = input.employees.slice(0, 20).map((e) => `- ${withLegalName(e)}, ${e.jobTitle}, starting ${formatDay(e.startDate)}`);
  if (n > 20) listed.push(`- and ${n - 20} more`);
  return {
    subject: `${n === 1 ? `${knownAs(input.employees[0]!)} is` : `${n} employees are`} ready for your signature`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Hi ${firstName(input.name)}, ${n === 1 ? 'a Schedule A needs' : `${n} Schedule As need`} your signature`,
      paragraphs: [
        input.reason ?? `Ensaar has prepared the Schedule A for ${n === 1 ? 'this employee' : 'these employees'} of ${input.companyName}:`,
        listed.join('\n'),
        'Each schedule is one page and adds that person to your agreement. You can review and sign them all at once.',
      ],
      action: { label: 'Review and sign', href: portalUrl('?tab=employees&filter=awaiting_signature') },
    }),
  };
}

export function masterSignedStaffEmail(input: { companyName: string; signer: string; companyId: string }): Mail {
  return {
    subject: `Signed: ${input.companyName} master agreement. Review needed`,
    ...renderEmail({
      eyebrow: 'Basecamp: EOR review',
      heading: `${input.companyName} signed the master agreement`,
      paragraphs: [
        `${input.signer} signed. Review the company documents, accept or reject each one, then countersign. The customer was told to expect a review within one working day.`,
      ],
      action: { label: 'Review in Basecamp', href: `${siteUrl()}/basecamp/clients/${input.companyId}` },
    }),
  };
}

export function masterSignedCustomerEmail(input: { name: string; companyName: string }): Mail {
  return {
    subject: `We received ${input.companyName}'s signed agreement`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Thank you, ${firstName(input.name)}`,
      paragraphs: [
        `We have ${input.companyName}'s signed Employer of Record agreement. A copy of exactly what you signed is attached.`,
        'Ensaar will review your documents and countersign, usually within one working day.',
      ],
      action: { label: 'Open the portal', href: portalUrl() },
    }),
  };
}

export function companyChangesEmail(input: {
  companyName: string;
  note: string;
  rejected: Array<{ label: string; filename: string; reason: string }>;
  resigned: boolean;
}): Mail {
  return {
    subject: `Action needed: ${input.companyName} on Ensaar`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: 'A few things need your attention',
      paragraphs: [
        input.note,
        ...(input.rejected.length ? [`Please replace:\n${input.rejected.map((d) => `- ${d.label} (${d.filename}): ${d.reason}`).join('\n')}`] : []),
        ...(input.resigned ? ['Because the agreement rests on these details, it will need to be signed again once they are fixed.'] : []),
      ],
      action: { label: 'Open the portal', href: portalUrl() },
    }),
  };
}

export function companyApprovedEmail(input: { companyName: string }): Mail {
  return {
    subject: `Countersigned: ${input.companyName}'s Ensaar agreement`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: 'Your agreement is countersigned',
      paragraphs: [
        `Ensaar has countersigned the Employer of Record agreement with ${input.companyName}. The executed copy is attached; please keep it with your records.`,
        'Each employee is added with their own one-page Schedule A, which you sign in the portal.',
      ],
      action: { label: 'Open the portal', href: portalUrl() },
    }),
  };
}

export function schedulesSignedStaffEmail(input: { companyName: string; signer: string; count: number; companyId: string }): Mail {
  return {
    subject: `Signed: ${input.count} Schedule A${input.count === 1 ? '' : 's'} for ${input.companyName}. Countersign needed`,
    ...renderEmail({
      eyebrow: 'Basecamp: EOR review',
      heading: `${input.companyName} signed ${input.count} schedule${input.count === 1 ? '' : 's'}`,
      paragraphs: [`${input.signer} signed. Countersign them to start each employee's onboarding.`],
      action: { label: 'Review in Basecamp', href: `${siteUrl()}/basecamp/clients/${input.companyId}?tab=employees&status=signed` },
    }),
  };
}

export function schedulesSignedCustomerEmail(input: { name: string; companyName: string; employees: string[] }): Mail {
  const n = input.employees.length;
  return {
    subject: `We received ${n === 1 ? `${input.employees[0]}'s signed schedule` : `${n} signed schedules`}`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Thank you, ${firstName(input.name)}`,
      paragraphs: [
        `You signed the Schedule A for: ${input.employees.slice(0, 20).join(', ')}${n > 20 ? ` and ${n - 20} more` : ''}. A copy of what you signed is attached.`,
        'Ensaar countersigns and starts each onboarding, usually within one working day.',
      ],
      action: { label: 'Open the portal', href: portalUrl('?tab=employees') },
    }),
  };
}

export function schedulesCountersignedEmail(input: { companyName: string; employees: Array<Named & { startDate: string }> }): Mail {
  const n = input.employees.length;
  return {
    subject: `Countersigned: ${n === 1 ? knownAs(input.employees[0]!) : `${n} employees`} for ${input.companyName}`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `${n === 1 ? 'Onboarding has started' : `Onboarding has started for ${n} employees`}`,
      paragraphs: [
        input.employees.slice(0, 20).map((e) => `- ${knownAs(e)}, starting ${formatDay(e.startDate)}`).join('\n'),
        'The executed schedules are attached. You can follow each onboarding step in the portal.',
      ],
      action: { label: 'Open the portal', href: portalUrl('?tab=employees') },
    }),
  };
}

// --- Invoices: issued, reminders before and after the due date, paid ------------------------

type InvoiceMail = Pick<Invoice, 'number' | 'period' | 'amountUsd' | 'issuedOn' | 'dueOn' | 'summary'>;

const invoiceFacts = (invoice: InvoiceMail, extra: Array<{ label: string; value: string }> = []) => [
  { label: 'Invoice', value: invoice.number },
  { label: 'For', value: invoice.summary ? `${formatPeriod(invoice.period)}: ${invoice.summary}` : formatPeriod(invoice.period) },
  { label: 'Amount', value: formatUsdExact(invoice.amountUsd) },
  { label: 'Due', value: formatDay(invoice.dueOn) },
  ...extra,
];

const billingAction = { label: 'View your invoices', href: portalUrl('?tab=billing') };
// Why the date matters, without ever saying an employee's pay waits for the customer: Ensaar owes wages on time regardless.
const payrollLine = 'Your payment funds the salaries and statutory dues of your employees in India, which is why the due date matters.';
const billingFooter = () => `Already paid? Thank you: reply with the transfer reference and we will match it. Questions about this invoice? Write to ${INVOICE_ISSUER.accountsEmail}.`;
/** Where to send the money, when the bank details are configured (they always are once an invoice exists). */
const payTo = (): Array<{ label: string; value: string }> => {
  const settings = invoiceSettings();
  if (!settings.ok) return [];
  const { bank } = settings.value;
  return [
    { label: 'Pay to', value: `${bank.accountName}, ${bank.bankName}` },
    { label: 'Account', value: bank.accountNumber },
    { label: 'SWIFT', value: bank.swift },
    { label: 'IFSC', value: bank.ifsc },
  ];
};

export function invoiceIssuedEmail(input: { companyName: string; invoice: InvoiceMail }): Mail {
  const { invoice } = input;
  return {
    subject: `Invoice ${invoice.number} for ${input.companyName}: ${formatUsdExact(invoice.amountUsd)} due ${formatDay(invoice.dueOn)}`,
    ...renderEmail({
      eyebrow: 'Billing',
      heading: `Your ${formatPeriod(invoice.period)} invoice`,
      paragraphs: [
        `Ensaar has issued invoice ${invoice.number} to ${input.companyName}, dated ${formatDay(invoice.issuedOn)}. The invoice is attached. It is payable within ${PAYMENT_DAYS} days by international wire to the account below. ${PAYMENT_METHOD_LINE.split('. ')[1]}`,
        payrollLine,
      ],
      facts: [...invoiceFacts(invoice), ...payTo()],
      action: billingAction,
      footer: billingFooter(),
    }),
  };
}

/** A reminder before the due date, on it, or after it. Overdue notices state the interest that has accrued. */
export function invoiceReminderEmail(input: { companyName: string; invoice: InvoiceMail; stage: Pick<ReminderStage, 'kind' | 'daysLate'>; today: string }): Mail {
  const { invoice, stage } = input;
  const amount = formatUsdExact(invoice.amountUsd);
  if (stage.kind === 'overdue') {
    const days = `${stage.daysLate} day${stage.daysLate === 1 ? '' : 's'}`;
    const interest = lateInterestUsd(invoice.amountUsd, stage.daysLate);
    return {
      subject: `Overdue: invoice ${invoice.number} for ${input.companyName} is ${days} late`,
      ...renderEmail({
        eyebrow: 'Billing',
        heading: `Invoice ${invoice.number} is overdue`,
        notice: { tone: 'danger', text: `${amount} was due on ${formatDay(invoice.dueOn)} and is now ${days} late. Interest is accruing, and continued non-payment puts your service with Ensaar at risk.` },
        paragraphs: [
          `We have not received ${input.companyName}'s payment of invoice ${invoice.number}. Please arrange the international wire today, to the account below.`,
          `Under the agreement, an overdue amount carries interest at ${LATE_INTEREST_PERCENT_PER_MONTH}% per month, calculated daily, which is added to your next invoice. While an invoice is overdue Ensaar may decline to take on new employees and may end the arrangement, and the costs of doing so, including notice pay, are payable by ${input.companyName}.`,
        ],
        facts: [
          ...invoiceFacts(invoice, [
            { label: 'Days overdue', value: String(stage.daysLate) },
            { label: 'Interest accrued so far', value: formatUsdExact(interest) },
          ]),
          ...payTo(),
        ],
        action: billingAction,
        footer: billingFooter(),
      }),
    };
  }
  const daysLeft = daysBetween(input.today, invoice.dueOn);
  const when = stage.kind === 'due' ? 'today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  return {
    subject: `Reminder: invoice ${invoice.number} for ${input.companyName} is due ${stage.kind === 'due' ? 'today' : formatDay(invoice.dueOn)}`,
    ...renderEmail({
      eyebrow: 'Billing',
      heading: `Invoice ${invoice.number} is due ${when}`,
      notice: { tone: stage.kind === 'due' ? 'warning' : 'info', text: `${amount} is due ${stage.kind === 'due' ? 'today' : `on ${formatDay(invoice.dueOn)}`}. Paying by the due date avoids interest.` },
      paragraphs: [
        `A reminder that ${input.companyName}'s invoice ${invoice.number} is payable by international wire, to the account below.`,
        `${payrollLine} An amount paid late also carries interest at ${LATE_INTEREST_PERCENT_PER_MONTH}% per month.`,
      ],
      facts: [...invoiceFacts(invoice), ...payTo()],
      action: billingAction,
      footer: billingFooter(),
    }),
  };
}

export function invoicePaidEmail(input: { companyName: string; invoice: InvoiceMail; paidOn: string }): Mail {
  const { invoice } = input;
  return {
    subject: `Payment received: invoice ${invoice.number} for ${input.companyName}`,
    ...renderEmail({
      eyebrow: 'Billing',
      heading: 'Payment received, thank you',
      paragraphs: [`Ensaar has received ${input.companyName}'s payment of invoice ${invoice.number}. Nothing more is needed from you for ${formatPeriod(invoice.period)}.`],
      facts: [
        { label: 'Invoice', value: invoice.number },
        { label: 'Amount', value: formatUsdExact(invoice.amountUsd) },
        { label: 'Received', value: formatDay(input.paidOn) },
      ],
      action: billingAction,
    }),
  };
}

/** Tells Ensaar staff once, when an invoice first goes overdue, because payroll now depends on chasing it. */
export function invoiceOverdueStaffEmail(input: { companyName: string; companyId: string; invoice: InvoiceMail }): Mail {
  const { invoice } = input;
  return {
    subject: `Overdue: ${input.companyName} has not paid invoice ${invoice.number}`,
    ...renderEmail({
      eyebrow: 'Basecamp: billing',
      heading: `${input.companyName} is late paying invoice ${invoice.number}`,
      paragraphs: [
        `${formatUsdExact(invoice.amountUsd)} was due on ${formatDay(invoice.dueOn)}. The customer has been sent an overdue notice and will get more until the invoice is marked paid in Basecamp.`,
        'Ensaar must still pay their employees on time whatever the customer does, so chase this now. Call the customer, and mark the invoice paid as soon as the money arrives so the reminders stop.',
      ],
      facts: invoiceFacts(invoice),
      action: { label: 'Open in Basecamp', href: `${siteUrl()}/basecamp/clients/${input.companyId}?tab=invoices` },
    }),
  };
}

// --- The employee portal ------------------------------------------------------------------------

const teamUrlFor = (path = '') => `${siteUrl()}/team${path}`;

/** Invites an employee into the portal, saying why (documents to sign, holidays to choose, tax to declare). */
export function teamInviteEmail(input: { name: string; companyName: string | null; reason: string; link: string }): Mail {
  return {
    subject: `${firstName(input.name)}, ${input.reason.charAt(0).toLowerCase()}${input.reason.slice(1).replace(/\.$/, '')}`,
    ...renderEmail({
      eyebrow: 'Ensaar employee portal',
      heading: `Hi ${firstName(input.name)}, welcome to Ensaar`,
      paragraphs: [
        input.reason,
        `Ensaar is your employer${input.companyName ? ` for your work with ${input.companyName}` : ''}. In the employee portal you sign your offer letter and employment agreement, choose your tax regime and declare investments, and see your team's holiday calendar for the year.`,
      ],
      action: { label: 'Open the employee portal', href: input.link },
      contact: hrAddress(),
      footer: `The link works once and expires in ${INVITE_LINK_TTL_DAYS} days. After that, sign in at ${teamUrlFor()} with this email address. Questions? Write to ${hrAddress()}.`,
    }),
  };
}

export function teamLoginEmail(input: { name: string; link: string }): Mail {
  return {
    subject: 'Your Ensaar employee portal sign-in link',
    ...renderEmail({
      eyebrow: 'Ensaar employee portal',
      contact: hrAddress(),
      heading: `Hi ${firstName(input.name)}, here is your sign-in link`,
      paragraphs: [`Use this link to sign in to the Ensaar employee portal. It works once and expires in ${LOGIN_LINK_TTL_MINUTES} minutes.`],
      action: { label: 'Sign in', href: input.link },
      footer: `If you did not ask to sign in, you can ignore this email. Questions? Write to ${hrAddress()}.`,
    }),
  };
}

const DOC_NAMES = { offer: 'offer letter', agreement: 'employment agreement' } as const;

/** The employee's copy of what they signed, with the signed text attached. */
export function employeeDocumentSignedEmail(input: { name: string; kind: keyof typeof DOC_NAMES }): Mail {
  return {
    subject: `Your signed ${DOC_NAMES[input.kind]}`,
    ...renderEmail({
      eyebrow: 'Ensaar employee portal',
      contact: hrAddress(),
      heading: `Thank you, ${firstName(input.name)}`,
      paragraphs: [`You signed your ${DOC_NAMES[input.kind]} with Ensaar. A copy of exactly what you signed is attached, and it stays available in the employee portal.`],
      action: { label: 'Open the employee portal', href: teamUrlFor() },
    }),
  };
}

export function employeeDocumentSignedStaffEmail(input: { name: string; kind: keyof typeof DOC_NAMES; employeeId: string; companyName: string }): Mail {
  return {
    subject: `Signed: ${input.name}'s ${DOC_NAMES[input.kind]} (${input.companyName})`,
    ...renderEmail({
      eyebrow: 'Basecamp: employees',
      heading: `${input.name} signed their ${DOC_NAMES[input.kind]}`,
      paragraphs: [`${input.name}, who works for ${input.companyName}, signed the ${DOC_NAMES[input.kind]} Ensaar issued. The signed copy is on their page in Basecamp.`],
      action: { label: 'Open in Basecamp', href: `${siteUrl()}/basecamp/employees/${input.employeeId}` },
    }),
  };
}

/** To the client's portal users: an employee proposed the team's holiday calendar, approve it. */
export function holidaysSubmittedEmail(input: { companyName: string; employeeName: string; year: number; holidays: string[] }): Mail {
  return {
    subject: `Your team's ${input.year} holiday calendar: approval needed`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Approve your team's holidays for ${input.year}`,
      paragraphs: [
        `${input.employeeName} proposed the holidays below for ${input.year}. Once you approve them, they apply to everyone Ensaar employs for ${input.companyName}, in addition to India's national holidays.`,
        input.holidays.map((h) => `- ${h}`).join('\n'),
        'Approve the calendar, or ask for changes with a note, in the portal.',
      ],
      action: { label: 'Review in the portal', href: portalUrl('?tab=holidays') },
    }),
  };
}

export function holidaysDecidedEmail(input: { companyName: string; year: number; approved: boolean; note: string | null; byEnsaar: boolean }): Mail {
  const who = input.byEnsaar ? 'Ensaar' : input.companyName;
  return {
    subject: input.approved ? `Your ${input.year} holidays are set` : `The ${input.year} holiday calendar needs a change`,
    ...renderEmail({
      eyebrow: 'Ensaar employee portal',
      contact: hrAddress(),
      heading: input.approved ? `Your ${input.year} holidays are set` : `Please change the ${input.year} holiday calendar`,
      notice: input.approved ? undefined : { tone: 'warning', text: input.note ?? 'The calendar was not approved.' },
      paragraphs: [
        input.approved
          ? `${who} approved the ${input.year} holiday calendar. It applies to everyone Ensaar employs for ${input.companyName}, in addition to India's national holidays.${input.note ? ` Note: ${input.note}` : ''}`
          : `${who} asked for changes to the ${input.year} holiday calendar you proposed. Change it in the portal and submit it again.`,
      ],
      action: { label: 'See the calendar', href: teamUrlFor('?tab=holidays') },
    }),
  };
}

// --- Items still outstanding: reminded every Monday and Thursday until they arrive -----------------

const reminderCadence = 'We will remind you every Monday and Thursday until these are in.';

/** To the client's signatory and portal users: what Ensaar still needs, while onboarding carries on. */
export function companyOutstandingEmail(input: { name: string | null; companyName: string; received: string[]; needed: Outstanding[] }): Mail {
  const n = input.needed.length;
  return {
    subject: `${input.companyName}: ${itemCount(n)} still needed by Ensaar`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `Hi ${firstName(input.name)}, ${n === 1 ? 'one item is' : n === 2 ? 'two items are' : 'a few items are'} still outstanding`,
      paragraphs: [
        `Thank you for choosing Ensaar. You can keep going with onboarding while ${n === 1 ? 'this is' : 'these are'} outstanding. We need ${n === 1 ? 'it' : 'them'} before we run ${input.companyName}'s first payroll.`,
        input.needed.map((item) => `- ${item.detail}`).join('\n'),
        'If something will take longer, reply to this email and tell us when to expect it.',
      ],
      facts: [
        ...(input.received.length ? [{ label: 'Received', value: input.received.join(', ') }] : []),
        { label: 'Still needed', value: input.needed.map((item) => item.label).join(', ') },
      ],
      action: { label: n === 1 ? 'Add it in the portal' : 'Add them in the portal', href: portalUrl('?tab=documents') },
      footer: `${reminderCadence} Questions? Write to ${supportAddress()}.`,
    }),
  };
}

/** To the employee: what Ensaar still needs to pay them, by the name they go by. */
export function employeeOutstandingEmail(input: { name: string; received: string[]; needed: Outstanding[] }): Mail {
  const n = input.needed.length;
  const received = input.received.filter((r) => r === 'PAN' || r === 'Aadhaar');
  return {
    subject: `${firstName(input.name)}, ${itemCount(n)} still needed for your onboarding`,
    ...renderEmail({
      eyebrow: 'Ensaar employee portal',
      contact: hrAddress(),
      heading: `Hi ${firstName(input.name)}, ${n === 1 ? 'one item is' : n === 2 ? 'two items are' : 'a few items are'} still outstanding`,
      paragraphs: [
        `${received.length === 2 ? 'We have your PAN and Aadhaar. ' : ''}To pay your salary on time, Ensaar still needs:`,
        input.needed.map((item) => `- ${item.detail}`).join('\n'),
        'If something will take longer, reply to this email and tell us when to expect it.',
      ],
      facts: [
        ...(input.received.length ? [{ label: 'Received', value: input.received.join(', ') }] : []),
        { label: 'Still needed', value: input.needed.map((item) => item.label).join(', ') },
      ],
      action: { label: n === 1 ? 'Add it in the employee portal' : 'Add them in the employee portal', href: teamUrlFor('?tab=details') },
      footer: `${reminderCadence} Questions? Write to ${hrAddress()}.`,
    }),
  };
}
