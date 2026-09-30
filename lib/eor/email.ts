import 'server-only';

import { renderEmail, supportAddress } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';
import { formatDay, INVITE_LINK_TTL_DAYS, LOGIN_LINK_TTL_MINUTES } from './onboarding';

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
  employees: Array<{ employeeName: string; jobTitle: string; startDate: string }>;
  reason?: string;
}): Mail {
  const n = input.employees.length;
  const listed = input.employees.slice(0, 20).map((e) => `- ${e.employeeName}, ${e.jobTitle}, starting ${formatDay(e.startDate)}`);
  if (n > 20) listed.push(`- and ${n - 20} more`);
  return {
    subject: `${n === 1 ? `${input.employees[0]!.employeeName} is` : `${n} employees are`} ready for your signature`,
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

export function schedulesCountersignedEmail(input: { companyName: string; employees: Array<{ employeeName: string; startDate: string }> }): Mail {
  const n = input.employees.length;
  return {
    subject: `Countersigned: ${n === 1 ? input.employees[0]!.employeeName : `${n} employees`} for ${input.companyName}`,
    ...renderEmail({
      eyebrow: 'Ensaar client portal',
      heading: `${n === 1 ? 'Onboarding has started' : `Onboarding has started for ${n} employees`}`,
      paragraphs: [
        input.employees.slice(0, 20).map((e) => `- ${e.employeeName}, starting ${formatDay(e.startDate)}`).join('\n'),
        'The executed schedules are attached. You can follow each onboarding step in the portal.',
      ],
      action: { label: 'Open the portal', href: portalUrl('?tab=employees') },
    }),
  };
}
