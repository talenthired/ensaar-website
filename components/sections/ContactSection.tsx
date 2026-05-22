'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Mail, MapPin, Clock, GraduationCap, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { cn, siteConfig } from '@/lib/utils';
import { fadeLeft, fadeRight, viewportOnce } from '@/lib/motion';

type Status = 'idle' | 'sending' | 'success' | 'error';

export function ContactSection() {
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    if (!data.name?.trim() || !data.email?.trim() || !data.message?.trim()) {
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
    const subject = encodeURIComponent(
      `Enquiry from ${data.name}${data.company ? ` (${data.company})` : ''}`,
    );
    const body = encodeURIComponent(
      `Name: ${data.name}\nEmail: ${data.email}\nCompany: ${data.company || ''}\n\n${data.message}`,
    );
    window.location.href = `mailto:${siteConfig.email}?subject=${subject}&body=${body}`;
    setStatus('success');
    setMessage('Opening your email client - thank you!');
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
          >
            <span className="eyebrow mb-5">Contact</span>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] mt-5 mb-5 text-balance">
              Let's Build <span className="gradient-text">Something Intelligent.</span>
            </h2>
            <p className="text-[1.0625rem] text-ink-secondary mb-10">
              Whether you're exploring what AI can do for your business, planning an engineering engagement, or considering a BCEP training intervention - we'd love to hear from you.
            </p>

            <ul className="flex flex-col gap-6">
              <ContactDetail
                Icon={Mail}
                label="General"
                value={siteConfig.email}
                href={`mailto:${siteConfig.email}`}
              />
              <ContactDetail
                Icon={GraduationCap}
                label="Training & BCEP"
                value={siteConfig.trainingEmail}
                href={`mailto:${siteConfig.trainingEmail}`}
              />
              <ContactDetail
                Icon={MapPin}
                label="Location"
                value={`${siteConfig.locality}, ${siteConfig.region}, ${siteConfig.state}, ${siteConfig.country}`}
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
            className="bg-bg-glass border border-line-subtle rounded-2xl p-10 backdrop-blur-md flex flex-col gap-5"
          >
            <Field label="Name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <Field label="Company" name="company" autoComplete="organization" />
            <Field label="How can we help?" name="message" textarea rows={5} required />

            <motion.button
              type="submit"
              disabled={status === 'sending'}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center justify-center gap-2 w-full px-8 py-4 rounded-full bg-gradient-brand text-white font-semibold shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-70"
            >
              {status === 'sending' ? 'Sending...' : 'Send Message'}
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
};

function Field({ label, name, type = 'text', required, autoComplete, textarea, rows = 4 }: FieldProps) {
  const common =
    'font-sans text-base px-4 py-3.5 bg-bg-primary/60 border border-line-subtle rounded-xl text-ink-primary transition-all focus:outline-none focus:border-accent-primary focus:bg-bg-primary/85 focus:ring-[3px] focus:ring-accent-primary/15';
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-secondary">
        {label} {required && <span aria-hidden>*</span>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          className={`${common} resize-y`}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          autoComplete={autoComplete}
          className={common}
        />
      )}
    </label>
  );
}
