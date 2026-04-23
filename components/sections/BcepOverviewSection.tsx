'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Check, Users, MessageSquare, Target, GraduationCap } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { BCEP_ADVANTAGES, BCEP_TRACKS, BCEP_OUTCOMES } from '@/lib/content/bcep';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import { siteConfig } from '@/lib/utils';

const TRACK_ICONS = {
  leadership: Users,
  'soft-skills': MessageSquare,
  professional: Target,
  'train-the-trainer': GraduationCap,
} as const;

export function BcepOverviewSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="bcep" className="overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(6,182,212,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />

      <Container>
        <SectionHeader
          eyebrow="BCEP"
          title={
            <>
              Ensaar's Business <span className="gradient-text">Excellence Program</span>
            </>
          }
          lede="Workshops · Training Interventions · Capability Building — uniquely integrating corporate know-how with structured skill development. We don't just teach; we build sustained behavioral change that reflects in real workplace performance."
        />

        <motion.div
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-20"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {BCEP_ADVANTAGES.map((adv) => (
            <motion.div
              key={adv.num}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="relative p-7 bg-bg-glass border border-line-subtle rounded-2xl backdrop-blur-md overflow-hidden group hover:border-line-glow hover:shadow-glow transition-all"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-brand origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <span className="block font-mono text-sm tracking-[0.15em] text-accent-cyan-soft mb-4 opacity-80">
                {adv.num}
              </span>
              <h3 className="text-lg mb-2">{adv.title}</h3>
              <p className="text-[0.9375rem] text-ink-secondary">{adv.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mb-10">
          <h3 className="text-[clamp(1.5rem,3vw,2rem)] mb-3">Four Core Training Tracks</h3>
          <p className="text-ink-secondary max-w-[560px] mx-auto">
            Each track is designed to move people and teams forward — grounded in real workplace scenarios.
          </p>
        </div>

        <motion.div
          className="grid gap-6 md:grid-cols-2 mb-16"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {BCEP_TRACKS.map((track) => {
            const Icon = TRACK_ICONS[track.slug as keyof typeof TRACK_ICONS];
            return (
              <motion.article
                key={track.slug}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="relative p-8 bg-bg-glass border border-line-subtle rounded-2xl backdrop-blur-md overflow-hidden group hover:border-line-glow hover:shadow-glow transition-all"
              >
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-brand-soft border border-line-subtle text-accent-secondary mb-5">
                  <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                </div>
                <h4 className="text-xl mb-4">{track.name}</h4>
                <ul className="flex flex-col gap-2.5 mb-6">
                  {track.modules.slice(0, 5).map((m) => (
                    <li key={m} className="text-[0.9375rem] text-ink-secondary pl-6 relative">
                      <span className="absolute left-0 top-[0.55rem] w-2.5 h-0.5 rounded-sm bg-gradient-brand" />
                      {m}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/bcep/${track.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent-secondary hover:text-accent-cyan-soft transition-colors group/cta"
                >
                  Explore {track.name}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" aria-hidden />
                </Link>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-8 bg-gradient-to-br from-accent-primary/[0.08] to-accent-cyan/[0.06] border border-line-glow rounded-2xl mb-12"
        >
          {BCEP_OUTCOMES.map((outcome) => (
            <div key={outcome} className="flex items-center gap-3 text-[0.9375rem] text-ink-primary">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-cyan/15 border border-accent-cyan/35 text-accent-cyan">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
              </div>
              <span>{outcome}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-10 bg-bg-glass-strong border border-line-glow rounded-2xl backdrop-blur-lg overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_50%,rgba(99,102,241,0.15),transparent_60%)]"
          />
          <div className="relative">
            <h3 className="text-[clamp(1.25rem,2.4vw,1.625rem)] mb-2">
              Let's build individuals who drive business success.
            </h3>
            <p className="text-ink-secondary text-[0.9375rem]">
              Training enquiries have their own dedicated inbox.
            </p>
          </div>
          <div className="relative">
            <Button href={`mailto:${siteConfig.trainingEmail}`} size="lg" withArrow>
              {siteConfig.trainingEmail}
            </Button>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
