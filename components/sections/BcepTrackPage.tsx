'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Check, ClipboardCheck, Users } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import { siteConfig } from '@/lib/utils';
import type { BcepTrack } from '@/lib/content/bcep';

export function BcepTrackPage({ track }: { track: BcepTrack }) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <div className="pt-32 pb-12">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Services', href: '/services' },
              { name: 'Corporate Training', href: '/services/corporate-training' },
              { name: track.name, href: `/services/corporate-training/${track.slug}` },
            ]}
          />
          <motion.div
            initial={false}
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.span variants={fadeUp} className="eyebrow mb-5">
              BCEP AI Readiness Certification
            </motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance"
            >
              {track.name.split(' ').slice(0, -1).join(' ')}{' '}
              <span className="gradient-text">{track.name.split(' ').slice(-1)[0]}</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="text-xl text-ink-secondary mb-4">
              {track.tagline}
            </motion.p>
            <motion.p variants={fadeUp} className="text-lg text-ink-secondary">
              {track.description}
            </motion.p>
          </motion.div>
        </Container>
      </div>

      <section className="py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <motion.div
              initial={reducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger}
              className="border border-line-subtle bg-bg-secondary p-8 md:p-10"
            >
              <motion.h2 variants={fadeUp} className="text-2xl mb-8">
                Certification curriculum
              </motion.h2>
              <ul className="flex flex-col gap-3">
                {track.modules.map((mod) => (
                  <motion.li
                    key={mod}
                    variants={fadeUp}
                    className="flex items-start gap-3 text-ink-secondary"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-primary/15 border border-accent-primary/40 text-accent-primary mt-0.5 shrink-0">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span>{mod}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={reducedMotion ? 'visible' : 'hidden'}
              whileInView="visible"
              viewport={viewportOnce}
              variants={stagger}
              className="sticky top-28 h-fit border border-line-glow bg-bg-secondary p-8 shadow-card md:p-10"
            >
              <motion.div variants={fadeUp} className="flex items-center gap-3 text-accent-secondary mb-4">
                <Users className="h-5 w-5" />
                <span className="font-mono text-xs uppercase tracking-[0.15em]">Audience</span>
              </motion.div>
              <motion.p variants={fadeUp} className="text-ink-primary mb-8">
                {track.audience}
              </motion.p>
              <motion.div variants={fadeUp} className="mb-7 border-y border-line-subtle py-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
                  <BadgeCheck className="h-4 w-4 text-accent-warm" aria-hidden />
                  Credential
                </div>
                <p className="mt-2 text-sm text-ink-secondary">{track.credential}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-ink-primary">
                  <ClipboardCheck className="h-4 w-4 text-accent-cyan" aria-hidden />
                  Assessment
                </div>
                <p className="mt-2 text-sm text-ink-secondary">{track.assessment}</p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Button href={`mailto:${siteConfig.trainingEmail}`} withArrow className="w-full">
                  Get BCEP Certified
                </Button>
                <Link href="/verify" className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-accent-primary hover:text-accent-secondary">
                  Verify an existing certificate <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <p className="text-xs text-ink-muted font-mono text-center mt-3">
                  {siteConfig.trainingEmail}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </Container>
      </section>
    </>
  );
}
