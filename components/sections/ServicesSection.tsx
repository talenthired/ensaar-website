'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Brain, Braces, GraduationCap, Users } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { SERVICES } from '@/lib/content/services';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const ICONS = {
  'ai-solutions': Brain,
  'software-development': Braces,
  staffing: Users,
  'corporate-training': GraduationCap,
} as const;

export function ServicesSection({ variant = 'home' }: { variant?: 'home' | 'full' }) {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="services" className={variant === 'full' ? 'bg-bg-primary' : undefined}>
      <Container>
        <SectionHeader
          eyebrow="What We Do"
          title={
            <>
              Build the technology. <span className="gradient-text">Enable the people.</span>
            </>
          }
          lede="Enterprise AI creates value only when software, infrastructure, governance, and human capability move together."
        />

        <motion.div
          className="border-t border-line-subtle"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {SERVICES.map((service, index) => {
            const Icon = ICONS[service.slug as keyof typeof ICONS] || Brain;
            return (
              <motion.article
                key={service.slug}
                variants={fadeUp}
                className="group grid gap-6 border-b border-line-subtle py-9 lg:grid-cols-[110px_0.9fr_1.1fr_auto] lg:gap-10 lg:py-11"
              >
                <div className="flex items-center gap-4 text-accent-secondary">
                  <span className="font-mono text-xs">0{index + 1}</span>
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl">{service.name}</h3>
                  <p className="mt-4 leading-relaxed text-ink-secondary">{service.shortDescription}</p>
                </div>
                <ul className="grid gap-x-6 gap-y-3 text-sm text-ink-secondary sm:grid-cols-2">
                  {service.offerings.slice(0, 4).map((offering) => (
                    <li key={offering} className="border-l-2 border-accent-cyan pl-3">{offering}</li>
                  ))}
                </ul>
                <Link
                  href={`/services/${service.slug}`}
                  aria-label={`Explore ${service.name}`}
                  className="flex h-11 w-11 items-center justify-center border border-line-subtle text-accent-primary transition hover:border-accent-primary hover:bg-accent-primary hover:text-white"
                >
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </motion.article>
            );
          })}
        </motion.div>
      </Container>
    </Section>
  );
}
