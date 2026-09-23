'use client';

import { FormEvent, useState } from 'react';
import { Send } from 'lucide-react';
import { readAttribution } from '@/components/marketing/AttributionCapture';
import { trackEvent } from '@/lib/analytics';
import { siteConfig } from '@/lib/utils';

type Status = 'idle' | 'sending' | 'success' | 'error';

/**
 * Candidate registration.
 *
 * Posts to the same /api/leads endpoint as the client enquiry form, with
 * leadSource 'careers' so the two populations stay separable in Basecamp. A
 * candidate is not a sales lead and should never be worked like one.
 */
export function TalentPoolForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    if (!data.name?.trim() || !data.email?.trim() || !data.role?.trim()) {
      setStatus('error');
      setMessage('Please give us your name, email, and the kind of role you want.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('sending');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          website: data.website, // honeypot
          workType: `Candidate: ${data.role}`.slice(0, 160),
          audience: 'Candidate',
          timeline: data.notice,
          details: [
            `Role: ${data.role}`,
            data.experience ? `Experience: ${data.experience}` : '',
            data.location ? `Location: ${data.location}` : '',
            data.notice ? `Notice period: ${data.notice}` : '',
            data.links ? `Links: ${data.links}` : '',
            data.message ? `Notes: ${data.message}` : '',
          ].filter(Boolean).join('\n'),
          leadSource: 'careers',
          sourcePath: window.location.pathname,
          ...readAttribution(),
        }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to register right now.');
      form.reset();
      setStatus('success');
      trackEvent('talent_pool_submitted', { role: data.role });
      setMessage(
        `Thank you. Reference ${result.id?.slice(0, 8).toUpperCase()}. We will contact you when a client role matches what you do.`,
      );
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : `Unable to register. Email ${siteConfig.email}.`);
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-line-glow bg-bg-secondary p-8 text-center shadow-card">
        <h3 className="text-2xl">You are on the list.</h3>
        <p className="mt-3 text-ink-secondary">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-w-0 flex-col gap-5 border border-line-subtle bg-bg-secondary p-6 shadow-card sm:p-9">
      <Field label="Name" name="name" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Phone or WhatsApp" name="phone" type="tel" autoComplete="tel" />
      <Field
        label="What work do you do?"
        name="role"
        required
        placeholder="Backend engineer, data analyst, QA, support, finance operations"
      />
      <Field label="Years of experience" name="experience" options={['Student or fresher', '1 to 3 years', '4 to 7 years', '8 to 12 years', 'More than 12 years']} />
      <Field label="Where are you based?" name="location" placeholder="City, and whether you can work hybrid or on site" />
      <Field label="Notice period" name="notice" options={['Available now', '15 days', '30 days', '60 days', '90 days']} />
      <Field label="Links" name="links" placeholder="LinkedIn, GitHub, or portfolio" />
      <Field label="Anything else we should know?" name="message" textarea rows={4} />
      <div className="hidden" aria-hidden>
        <label htmlFor="website-hp">Website</label>
        <input id="website-hp" name="website" type="text" tabIndex={-1} autoComplete="off" suppressHydrationWarning />
      </div>

      <p className="text-xs leading-relaxed text-ink-muted">
        We keep your details to consider you for roles with our client companies. We do not sell them,
        and you can ask us to delete them at any time by emailing {siteConfig.email}.
      </p>

      <button
        type="submit"
        suppressHydrationWarning
        disabled={status === 'sending'}
        className="inline-flex items-center justify-center gap-2 bg-accent-primary px-6 py-3.5 font-semibold text-accent-ink transition hover:bg-accent-press disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending...' : 'Join the talent pool'}
        <Send className="h-4 w-4" aria-hidden />
      </button>
      {status === 'error' && <p className="text-sm text-red-500" role="alert">{message}</p>}
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  options,
  textarea,
  rows,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  options?: string[];
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `talent-${name}`;
  const shared =
    'w-full border border-line-subtle bg-bg-primary px-4 py-3 text-[0.9375rem] text-ink-primary outline-none transition focus:border-accent-primary';
  return (
    <label htmlFor={id} className="grid gap-2 text-sm font-semibold text-ink-primary">
      {label}
      {required && <span className="sr-only">(required)</span>}
      {options ? (
        <select id={id} name={name} className={shared} suppressHydrationWarning defaultValue="">
          <option value="">Select</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : textarea ? (
        <textarea id={id} name={name} rows={rows ?? 4} placeholder={placeholder} className={`${shared} resize-y`} suppressHydrationWarning />
      ) : (
        <input id={id} name={name} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete} className={shared} suppressHydrationWarning />
      )}
    </label>
  );
}
