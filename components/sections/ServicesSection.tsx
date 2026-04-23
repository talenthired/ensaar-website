'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Brain, Cpu, Cog } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { GradientBorder } from '@/components/ui/GradientBorder';
import { SERVICES } from '@/lib/content/services';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const ICONS = {
  'ai-solutions': Brain,
  engineering: Cog,
  technology: Cpu,
} as const;

const ACCENT_COLORS = {
  indigo: 'text-accent-primary',
  cyan: 'text-accent-cyan',
  violet: 'text-accent-secondary',
} as const;

export function ServicesSection({ variant = 'home' }: { variant?: 'home' | 'full' }) {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="services">
      <Container>
        <SectionHeader
          eyebrow="Services"
          title={
            <>
              What We <span className="gradient-text">Build</span>
            </>
          }
          lede="Three core capabilities, unified by a single principle: technology that solves real problems elegantly."
        />

        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {SERVICES.map((service) => {
            const Icon = ICONS[service.slug as keyof typeof ICONS] || Brain;
            const iconClass = ACCENT_COLORS[service.accent];
            return (
              <motion.div key={service.slug} variants={fadeUp}>
                <GradientBorder className="h-full">
                  <article className="p-9 h-full flex flex-col relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className={`mb-6 ${iconClass}`}>
                      <Icon className="h-14 w-14" strokeWidth={1.5} aria-hidden />
                    </div>

                    <h3 className="text-2xl mb-3 relative">{service.name}</h3>
                    <p className="text-ink-secondary text-[0.9375rem] mb-5 relative">{service.shortDescription}</p>

                    <ul className="flex flex-col gap-2 mb-6 relative flex-1">
                      {service.offerings.slice(0, 5).map((offering) => (
                        <li
                          key={offering}
                          className="text-sm text-ink-secondary pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[0.6rem] before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent-primary before:shadow-[0_0_6px_rgba(99,102,241,1)]"
                        >
                          {offering}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/services/${service.slug}`}
                      className="relative inline-flex items-center gap-2 text-sm font-semibold text-accent-secondary hover:text-accent-cyan-soft transition-colors group/cta"
                    >
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" aria-hidden />
                    </Link>
                  </article>
                </GradientBorder>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
