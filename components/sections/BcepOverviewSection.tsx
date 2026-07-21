'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Check, ClipboardCheck, HeartHandshake } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { BCEP_ADVANTAGES, BCEP_TRACKS, BCEP_OUTCOMES } from '@/lib/content/bcep';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import { siteConfig } from '@/lib/utils';

export function BcepOverviewSection() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <Section id="bcep" className="bg-[#0c2343] text-white">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <span className="eyebrow text-cyan-300">BCEP AI Readiness Model</span>
              <h2 className="mt-7 text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.02]">
                A credential earned through application.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
              BCEP is the Business Communication Excellence Program from Ensaar. Each pathway
              combines AI readiness, emotional intelligence, structured learning, workplace
              application, and an assessed demonstration before certification.
            </p>
          </div>

          <div className="mt-12 grid gap-5 border-l-4 border-[#f5a623] bg-white/[0.06] p-7 md:grid-cols-[auto_1fr] md:items-start md:p-9">
            <HeartHandshake className="h-8 w-8 text-[#f5a623]" aria-hidden />
            <div>
              <h3 className="text-2xl text-white">AI readiness needs emotional intelligence.</h3>
              <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
                Self-awareness, empathy, emotional regulation, and constructive interpersonal judgment
                are embedded across BCEP leadership, communication, professional, and facilitation pathways
                because AI-assisted work still depends on clear thinking, responsible judgment, and trust.
              </p>
            </div>
          </div>

          <motion.div
            className="mt-14 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-4"
            initial={reducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={viewportOnce}
            variants={stagger}
          >
            {BCEP_ADVANTAGES.map((adv) => (
              <motion.div key={adv.num} variants={fadeUp} className="bg-[#0c2343] p-7 md:p-8">
                <span className="font-mono text-xs font-semibold tracking-[0.14em] text-cyan-300">{adv.num}</span>
                <h3 className="mt-7 text-xl">{adv.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{adv.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      <Section className="bg-bg-primary">
        <Container>
          <div className="mb-12 max-w-3xl md:mb-16">
            <span className="eyebrow">Certification Pathways</span>
            <h2 className="mt-6 text-[clamp(2.25rem,4.5vw,3.75rem)]">Choose the capability you want to prove.</h2>
            <p className="mt-5 text-lg text-ink-secondary">
              Available for individual professionals, company-sponsored cohorts, and AI readiness programs.
            </p>
          </div>

          <motion.div
            className="grid gap-4 md:grid-cols-2"
            initial={reducedMotion ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={viewportOnce}
            variants={stagger}
          >
            {BCEP_TRACKS.map((track, index) => (
              <motion.article key={track.slug} variants={fadeUp} className="group border border-line-subtle bg-bg-secondary p-7 transition hover:-translate-y-1 hover:border-line-glow hover:shadow-card md:p-9">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-semibold tracking-[0.14em] text-accent-secondary">0{index + 1}</span>
                  <BadgeCheck className="h-6 w-6 text-accent-warm" aria-hidden />
                </div>
                <h3 className="mt-8 text-2xl">{track.name}</h3>
                <p className="mt-3 leading-relaxed text-ink-secondary">{track.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink-primary">
                  <ClipboardCheck className="h-4 w-4 text-accent-cyan" aria-hidden />
                  {track.credential}
                </div>
                <Link href={`/services/corporate-training/${track.slug}`} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent-primary">
                  View certification
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </motion.article>
            ))}
          </motion.div>

          <div className="mt-12 grid gap-8 border border-line-glow bg-gradient-brand-soft p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div>
              <h3 className="text-2xl">What every BCEP pathway includes</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {BCEP_OUTCOMES.map((outcome) => (
                  <div key={outcome} className="flex items-start gap-3 text-sm text-ink-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" aria-hidden />
                    {outcome}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button href={`mailto:${siteConfig.trainingEmail}`} size="lg" withArrow>
                Start BCEP AI Readiness
              </Button>
              <Link href="/verify" className="inline-flex items-center justify-center gap-2 rounded-md border border-line-glow px-6 py-3.5 text-sm font-semibold text-ink-primary transition hover:border-accent-primary hover:text-accent-primary">
                Verify a Certificate <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
