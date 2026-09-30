import 'server-only';

import { renderEmail } from '@/lib/notify/outbox';
import { siteConfig } from '@/lib/utils';

/**
 * Send an invitation by email when Resend is configured.
 *
 * Returns whether it was sent rather than throwing, because the invitation is
 * already valid at this point: the link works whether or not the mail goes out.
 * The panel shows the link to copy when this returns false, so invitations are
 * usable on day one and simply get nicer once a key exists.
 */
export async function sendInvitationEmail(input: {
  to: string;
  link: string;
  role: string;
  invitedBy?: string | null;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || `Ensaar <hello@${new URL(siteConfig.url).hostname}>`;
  if (!key) return false;

  // The same branded layout as every other Ensaar email.
  const { text, html } = renderEmail({
    eyebrow: 'Basecamp',
    heading: 'You have been invited to Ensaar Basecamp',
    paragraphs: [
      `You were invited${input.invitedBy ? ` by ${input.invitedBy}` : ''} as ${input.role}.`,
      'Set a password to sign in. The link expires in seven days.',
    ],
    action: { label: 'Accept the invitation', href: input.link },
    footer: 'If you were not expecting this, ignore this email.',
  });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: 'You have been invited to Ensaar Basecamp',
        text,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
