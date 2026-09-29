import 'server-only';

import { siteConfig } from '@/lib/utils';
import { ONBOARDING_TTL_DAYS } from './onboarding';

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function onboardingLink(token: string): string {
  // The token goes in the fragment: never sent to a server, a log or a Referer.
  return `${siteConfig.url.replace(/\/+$/, '')}/onboard#${token}`;
}

/**
 * Send the customer their onboarding link when Resend is configured.
 *
 * Same contract as the Basecamp invitation email: returns whether it was sent
 * rather than throwing, because the link already works. Basecamp shows it to copy
 * when this returns false.
 */
export async function sendOnboardingEmail(input: {
  to: string;
  contactName: string;
  employeeName: string;
  link: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || `Ensaar <hello@${new URL(siteConfig.url).hostname}>`;
  if (!key) return false;

  const firstName = input.contactName.split(' ')[0] || input.contactName;
  const text = [
    `Hi ${firstName},`,
    '',
    `Thank you for choosing Ensaar to employ ${input.employeeName} in India. Three short steps are left:`,
    '1. Your company details',
    '2. Two documents: your certificate of incorporation and your EIN confirmation',
    '3. Review and sign the agreement',
    '',
    `It takes about ten minutes. The link is private to you and works for ${ONBOARDING_TTL_DAYS} days:`,
    input.link,
    '',
    `Questions? Reply to this email or write to ${siteConfig.email}.`,
    '',
    'Ensaar Global',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f5f7fa;color:#0c2343;font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;padding:28px">
    <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#5b6b82;margin:0 0 8px">Ensaar onboarding</p>
    <h1 style="font-size:20px;font-weight:700;margin:0 0 16px">Hi ${escape(firstName)}, three short steps are left</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px">
      Thank you for choosing Ensaar to employ <strong>${escape(input.employeeName)}</strong> in India.
    </p>
    <ol style="font-size:14px;line-height:1.7;margin:0 0 20px;padding-left:20px">
      <li>Your company details</li>
      <li>Two documents: your certificate of incorporation and your EIN confirmation</li>
      <li>Review and sign the agreement</li>
    </ol>
    <p style="margin:0 0 20px">
      <a href="${escape(input.link)}" style="display:inline-block;background:#0c2343;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">Start onboarding</a>
    </p>
    <p style="font-size:12px;line-height:1.6;color:#5b6b82;margin:0">
      About ten minutes. The link is private to you and works for ${ONBOARDING_TTL_DAYS} days.
      Questions? Reply to this email or write to ${escape(siteConfig.email)}.
    </p>
  </div>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: input.to,
        reply_to: siteConfig.email,
        subject: `Ensaar onboarding for ${input.employeeName}`,
        text,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
