'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { Mail, MapPin, Clock, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { cn, siteConfig } from '@/lib/utils';
import { fadeLeft, fadeRight, viewportOnce } from '@/lib/motion';
import { readAttribution } from '@/components/marketing/AttributionCapture';
import { trackEvent } from '@/lib/analytics';

type Status = 'idle' | 'sending' | 'success' | 'error';

export function ContactSection() {
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    if (!data.name?.trim() || !data.email?.trim() || !data.workType?.trim() || !data.message?.trim()) {
      setStatus('error');
      setMessage('Please fill in all required fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      setStatus('error');
      setMessage('Please enter a valid email.');
      return;
    }

    setStatus('sending');
    const attribution = readAttribution();
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          details: data.message,
          leadSource: 'contact-form',
          sourcePath: window.location.pathname,
          ...attribution,
        }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to submit request.');
      form.reset();
      setStatus('success');
      trackEvent('contact_form_submitted', {
        work_type: data.workType,
        audience: data.audience,
      });
      setMessage(
        `Request received. Reference ${result.id?.slice(0, 8).toUpperCase()}. We will reply within one business day.`,
      );
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : `Unable to submit. Email ${siteConfig.email}.`);
    }
  }

  return (
    <Section id="contact">
      <Container>
        <div className="grid gap-16 lg:grid-cols-2">
          <motion.div
            initial={reducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={viewportOnce}
            variants={fadeRight}
            className="min-w-0"
          >
            <span className="eyebrow mb-5">Start a Conversation</span>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] mt-5 mb-5 text-balance">
              Tell us what should work better because of AI.
            </h2>
            <p className="text-[1.0625rem] text-ink-secondary mb-10">
              Bring one workflow, role, or cohort. We will respond with a starting hypothesis, the questions that matter, and a practical first step within one business day.
            </p>

            <div className="mb-10 border-y border-line-subtle py-6">
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-accent-secondary">What happens next</div>
              <ol className="mt-4 grid gap-3 text-sm text-ink-secondary sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <li><span className="mr-2 font-mono text-accent-secondary">01</span>We review the intent</li>
                <li><span className="mr-2 font-mono text-accent-secondary">02</span>We identify the evidence needed</li>
                <li><span className="mr-2 font-mono text-accent-secondary">03</span>We propose a focused start</li>
              </ol>
            </div>

            <ul className="flex flex-col gap-6">
              <ContactDetail
                Icon={Mail}
                label="Email"
                value={siteConfig.email}
                href={`mailto:${siteConfig.email}`}
              />
              <ContactDetail
                Icon={MapPin}
                label="Locations"
                value={siteConfig.locations.map((location) => `${location.city}, ${location.state}`).join(' | ')}
              />
              <ContactDetail
                Icon={Clock}
                label="Hours"
                value="Mon - Fri | 9am - 5pm | Sat by appointment"
              />
            </ul>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            initial={reducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={viewportOnce}
            variants={fadeLeft}
            className="flex min-w-0 flex-col gap-5 border border-line-subtle bg-bg-secondary p-6 shadow-card sm:p-9"
          >
            <Field label="Name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Phone or WhatsApp" name="phone" type="tel" autoComplete="tel" />
            <Field label="Company" name="company" autoComplete="organization" />
            <Field
              label="I am reaching out as"
              name="audience"
              options={['Student or recent graduate', 'Engineer or technology professional', 'Startup or growing team', 'Enterprise or institution', 'Other']}
            />
            <Field
              label="What do you need?"
              name="workType"
              required
              options={[
                'Enterprise AI adoption and strategy',
                'AI engineering enablement',
                'IDE-native AI workflows',
                'Model, cloud, and deployment architecture',
                'AI solution or product feature',
                'DailyByte team or cohort enablement',
                'AI capability pilot for a team or campus',
                'Custom software development',
                'AI-ready engineering team',
                'BCEP (Business Communication Excellence Program) AI readiness certification',
                'Industry Readiness for college students',
                'Other',
              ]}
            />
            <Field
              label="Current AI adoption stage"
              name="adoptionStage"
              options={['Exploring possibilities', 'Running individual experiments', 'Planning a pilot', 'Scaling across teams', 'Improving governance and control']}
            />
            <Field
              label="Desired timeline"
              name="timeline"
              options={['Immediately', 'Within 30 days', 'This quarter', 'Exploring options']}
            />
            <Field label="Describe your requirement" name="message" textarea rows={5} required />
            <div className="hidden" aria-hidden>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" suppressHydrationWarning />
            </div>

            <p className="text-xs leading-relaxed text-ink-muted">
              By submitting, you agree that Ensaar may use this information to evaluate and respond to
              your request. See our <Link href="/legal/privacy" className="underline hover:text-ink-secondary">privacy notice</Link>.
            </p>

            <motion.button
              type="submit"
              suppressHydrationWarning
              disabled={status === 'sending'}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex w-full items-center justify-center gap-2 bg-gradient-brand px-8 py-4 font-semibold text-white shadow-card transition-all hover:brightness-105 disabled:opacity-70"
            >
              {status === 'sending' ? 'Submitting...' : 'Get My Starting Point'}
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </motion.button>

            <p
              role="status"
              aria-live="polite"
              className={cn(
                'text-sm text-center min-h-[1.25rem]',
                status === 'success' && 'text-emerald-400',
                status === 'error' && 'text-red-400',
              )}
            >
              {message}
            </p>
          </motion.form>
        </div>
      </Container>
    </Section>
  );
}

function ContactDetail({
  Icon,
  label,
  value,
  href,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-accent-primary/[0.12] border border-line-subtle text-accent-secondary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-ink-muted mb-1">
          {label}
        </div>
        {href ? (
          <a href={href} className="text-base text-ink-primary hover:text-accent-secondary transition-colors">
            {value}
          </a>
        ) : (
          <div className="text-base text-ink-primary">{value}</div>
        )}
      </div>
    </li>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  textarea?: boolean;
  rows?: number;
  options?: string[];
};

function Field({ label, name, type = 'text', required, autoComplete, textarea, rows = 4, options }: FieldProps) {
  const common =
    'w-full min-w-0 font-sans text-base px-4 py-3.5 bg-bg-primary/60 border border-line-subtle rounded-md text-ink-primary transition-all focus:outline-none focus:border-accent-primary focus:bg-bg-primary/85 focus:ring-[3px] focus:ring-accent-primary/15';
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-secondary">
        {label} {required && <span aria-hidden>*</span>}
      </span>
      {options ? (
        <select name={name} required={required} defaultValue="" className={common} suppressHydrationWarning>
          <option value="" disabled>Select one</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : textarea ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          suppressHydrationWarning
          className={`${common} resize-y`}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          autoComplete={autoComplete}
          suppressHydrationWarning
          className={common}
        />
      )}
    </label>
  );
}
