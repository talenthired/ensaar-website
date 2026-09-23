'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Building2, Cpu, UserRound, Users } from 'lucide-react';
import { AdvisorTrigger } from '@/components/marketing/AdvisorTrigger';
import { Container } from '@/components/ui/Container';
import { dailyByteLinks } from '@/lib/dailybyte';
import { EOR_PRICE_USD } from '@/lib/content/india';
import { fadeUp, viewportOnce } from '@/lib/motion';

const OFFERS = [
  {
    number: '01',
    icon: Building2,
    audience: 'Companies hiring in India',
    title: 'Employ someone in India in about two weeks.',
    description:
      'Ensaar becomes the legal employer. Compliant contract, payroll in rupees, provident fund, state insurance, professional tax, and TDS filed on time. You manage the person.',
    proof: `Employer of Record, $${EOR_PRICE_USD} per person per month`,
    action: 'See how it works',
    href: '/services/employer-of-record',
  },
  {
    number: '02',
    icon: Users,
    audience: 'Companies building a team',
    title: 'Start with a pod. Grow into your own centre.',
    description:
      'Three to fifteen people working only for you, with no entity and no lease. When headcount makes your own subsidiary cheaper, we incorporate it and move the team across.',
    proof: 'India Capability Centres',
    action: 'See the stages',
    href: '/services/gcc',
  },
  {
    number: '03',
    icon: Cpu,
    audience: 'Enterprise leaders',
    title: 'Bring one workflow. Leave with a decision map.',
    description:
      'We examine the value hypothesis, data readiness, risk controls, model fit, and the evidence required for a focused AI pilot.',
    proof: 'AI Workflow Diagnostic',
    action: 'Map my workflow',
    intent: 'enterprise' as const,
  },
  {
    number: '04',
    icon: UserRound,
    audience: 'Students and engineers',
    title: 'Do real work with AI. Get evidence of how you think.',
    description:
      'Use AI Learn for guided practice, AI Jobs to prepare from a specific job description, and Daily Code to keep core skills aligned.',
    proof: 'DailyByte™ for individuals',
    action: 'For Individuals',
    href: dailyByteLinks.individual,
  },
] as const;

export function ConversionOffersSection() {
  const reducedMotion = useReducedMotion();
  return (
    <section id="start-here" className="bg-bg-primary py-20 md:py-28">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <span className="eyebrow">Start here</span>
            <h2 className="mt-6 max-w-3xl text-[clamp(2.3rem,4.8vw,4.4rem)] leading-[1.02] text-balance">
              Choose the step that matches where you are.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-relaxed text-ink-secondary lg:justify-self-end">
            Most people arrive with one of four questions: how do I employ someone in India, how do I
            build a team there, where does AI actually pay off, and can I prove I work well with it.
          </p>
        </div>

        <div className="mt-14 border-y border-line-subtle">
          {OFFERS.map(({ number, icon: Icon, audience, title, description, proof, action, ...offer }) => {
            const external = 'href' in offer && offer.href.startsWith('http');
            return (
              <motion.article
                key={number}
                // Each offer arrives on its own: this is the page's main routing
                // decision, and reading them one at a time is the point.
                initial={reducedMotion ? 'visible' : 'hidden'}
                whileInView="visible"
                viewport={viewportOnce}
                variants={fadeUp}
                className="group grid gap-6 border-b border-line-subtle py-8 transition-colors last:border-b-0 hover:bg-bg-secondary/40 md:grid-cols-[90px_0.9fr_1.1fr] md:items-start md:py-10"
              >
                <div className="flex items-center gap-3 text-accent-secondary">
                  <span className="font-mono text-xs tracking-[0.12em]">{number}</span>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-secondary">{audience}</div>
                  <h3 className="mt-3 max-w-xl text-2xl leading-tight md:text-3xl">{title}</h3>
                  <div className="mt-5 inline-flex border-l-2 border-[#f5a623] pl-3 text-sm font-semibold text-ink-primary">{proof}</div>
                </div>
                <div className="md:pl-8">
                  <p className="leading-relaxed text-ink-secondary">{description}</p>
                  {'href' in offer ? (
                    <Link
                      href={offer.href}
                      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-primary transition hover:text-accent-primary"
                    >
                      {action}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </Link>
                  ) : (
                    <AdvisorTrigger intent={offer.intent} source={`offer-${number}`} variant="text" className="mt-6 rounded-none px-0 py-1 text-ink-primary hover:text-accent-primary">
                      {action}
                    </AdvisorTrigger>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
