import 'server-only';

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

  const escape = (value: string) =>
    value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const inviter = input.invitedBy ? ` by ${input.invitedBy}` : '';
  const inviterHtml = input.invitedBy ? ` by ${escape(input.invitedBy)}` : '';
  const text = [
    'You have been invited to Ensaar Basecamp',
    '',
    `You were invited${inviter} as ${input.role}.`,
    'Use this link to set a password and sign in. It expires in seven days.',
    input.link,
    '',
    'If you were not expecting this, ignore this email.',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="margin:0;background:#0c2343;color:#e8eef7;font-family:Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:32px">
  <div style="max-width:520px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9db2cd;margin:0 0 8px">Ensaar Basecamp</p>
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#ffffff">You have been invited</h1>
    <p style="font-size:14px;line-height:1.6;color:#c7d6e8;margin:0 0 20px">
      You were invited${inviterHtml} as <strong style="color:#ffffff">${escape(input.role)}</strong>. Set a password to sign in. The link expires in seven days.
    </p>
    <p style="margin:0 0 24px">
      <a href="${escape(input.link)}" style="display:inline-block;background:#f5a623;color:#0c2343;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:6px">Accept the invitation</a>
    </p>
    <p style="font-size:12px;line-height:1.6;color:#9db2cd;margin:0">If you were not expecting this, ignore this email.</p>
  </div>
</body></html>`;

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
