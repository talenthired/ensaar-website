import 'server-only';

import { renderEmail } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';
import { formatDay, ONBOARDING_TTL_DAYS, VERIFY_CODE_TTL_MINUTES } from './onboarding';

/**
 * The customer's link. The token goes in the fragment: never sent to a server,
 * a log or a Referer.
 */
export function onboardingLink(token: string): string {
  return `${siteUrl()}/onboard#${token}`;
}

export function recoveryUrl(): string {
  return `${siteUrl()}/onboard/recover`;
}

function siteUrl() {
  return siteConfig.url.replace(/\/+$/, '');
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function inviteEmail(input: { contactName: string; employeeName: string; link: string }) {
  return {
    subject: `Ensaar onboarding for ${input.employeeName}`,
    ...renderEmail({
      eyebrow: 'Ensaar onboarding',
      heading: `Hi ${firstName(input.contactName)}, three short steps are left`,
      paragraphs: [
        `Thank you for choosing Ensaar to employ ${input.employeeName} in India.`,
        '1. Your company details\n2. Two documents: your certificate of incorporation and your EIN confirmation\n3. Verify the signatory by email, then review and sign the agreement',
        `It takes about ten minutes. The link is private to you and works for ${ONBOARDING_TTL_DAYS} days.`,
      ],
      action: { label: 'Start onboarding', href: input.link },
    }),
  };
}

export function linkEmail(input: { contactName: string; employeeName: string; link: string; reason: string }) {
  return {
    subject: `Your Ensaar onboarding link for ${input.employeeName}`,
    ...renderEmail({
      eyebrow: 'Ensaar onboarding',
      heading: `Hi ${firstName(input.contactName)}, here is your link`,
      paragraphs: [
        input.reason,
        `It works for ${ONBOARDING_TTL_DAYS} days. Any earlier link for this onboarding no longer works.`,
      ],
      action: { label: 'Open onboarding', href: input.link },
      footer: `If you did not ask for this, you can ignore it. Questions? Write to ${siteConfig.email}.`,
    }),
  };
}

export function verifyCodeEmail(input: { signatoryName: string; companyName: string; code: string }) {
  return {
    subject: `${input.code} is your Ensaar signing code`,
    ...renderEmail({
      eyebrow: 'Signatory verification',
      heading: `Your code is ${input.code}`,
      paragraphs: [
        `Hi ${firstName(input.signatoryName)}, you were named as the person signing the Employer of Record agreement for ${input.companyName}.`,
        `Enter this code on the onboarding page to confirm it is you. It expires in ${VERIFY_CODE_TTL_MINUTES} minutes.`,
      ],
      footer: `If you are not the signatory for ${input.companyName}, do not share this code and tell us at ${siteConfig.email}.`,
    }),
  };
}

export function signatureReceivedEmail(input: { companyName: string; employeeName: string; signer: string; clientId: string }) {
  return {
    subject: `Signed: ${input.companyName} for ${input.employeeName}. Review needed`,
    ...renderEmail({
      eyebrow: 'Basecamp: EOR review',
      heading: `${input.companyName} signed the EOR agreement`,
      paragraphs: [
        `${input.signer} signed for ${input.employeeName}. Review the documents, accept or reject each one, then approve and countersign.`,
        'The customer was told to expect a review within one working day.',
      ],
      action: { label: 'Review in Basecamp', href: `${siteUrl()}/basecamp/clients/${input.clientId}` },
    }),
  };
}

export function signedConfirmationEmail(input: { name: string; companyName: string; employeeName: string }) {
  return {
    subject: `We received your signed agreement for ${input.employeeName}`,
    ...renderEmail({
      eyebrow: 'Ensaar onboarding',
      heading: `Thank you, ${firstName(input.name)}`,
      paragraphs: [
        `We have your signed Employer of Record agreement for ${input.companyName}. A copy of exactly what you signed is attached.`,
        'Ensaar will review your documents and countersign, usually within one working day. We will email you the countersigned copy.',
      ],
    }),
  };
}

export function changesRequestedEmail(input: {
  contactName: string;
  employeeName: string;
  note: string;
  rejected: Array<{ label: string; filename: string; reason: string }>;
  resigned: boolean;
}) {
  return {
    subject: `Action needed: your Ensaar onboarding for ${input.employeeName}`,
    ...renderEmail({
      eyebrow: 'Ensaar onboarding',
      heading: `Hi ${firstName(input.contactName)}, a few things need your attention`,
      paragraphs: [
        input.note,
        ...(input.rejected.length
          ? [`Please replace:\n${input.rejected.map((d) => `- ${d.label} (${d.filename}): ${d.reason}`).join('\n')}`]
          : []),
        ...(input.resigned ? ['Because the agreement has changed, it needs to be reviewed and signed again.'] : []),
        `Open your onboarding link to make the changes. If it has expired, you can get a new one at ${recoveryUrl()}.`,
      ],
      action: { label: 'Get my onboarding link', href: recoveryUrl() },
    }),
  };
}

export function approvedEmail(input: { name: string; companyName: string; employeeName: string; startDate: string }) {
  return {
    subject: `Countersigned: your Ensaar agreement for ${input.employeeName}`,
    ...renderEmail({
      eyebrow: 'Ensaar onboarding',
      heading: 'Your agreement is countersigned',
      paragraphs: [
        `Hi ${firstName(input.name)}, Ensaar has countersigned the Employer of Record agreement with ${input.companyName}. The executed copy is attached; please keep it with your records.`,
        `Next, we issue ${input.employeeName}'s employment contract and complete their onboarding for a start on ${formatDay(input.startDate)}. You can follow each step on your onboarding page.`,
      ],
      action: { label: 'Get my onboarding link', href: recoveryUrl() },
    }),
  };
}
