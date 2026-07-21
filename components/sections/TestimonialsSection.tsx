'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { TESTIMONIALS } from '@/lib/content/trust';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

/**
 * Anonymized client testimonials - Scadea-style.
 * Quote-led layout, attribution + organization framing without disclosing names.
 */
export function TestimonialsSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section>
      <Container>
        <SectionHeader
          eyebrow="What clients say"
          title={
            <>
              They trust us with <span className="gradient-text">work that has to ship.</span>
            </>
          }
          lede="Three engagements, three different industries, one consistent thread: outcomes that survive contact with real users."
        />

        <motion.div
          className="grid gap-6 md:grid-cols-3"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {TESTIMONIALS.map((t) => (
            <motion.figure
              key={t.id}
              variants={fadeUp}
              className="relative flex flex-col border border-line-subtle bg-bg-secondary p-7"
            >
              {/* large open quote glyph */}
              <span
                aria-hidden
                className="font-display text-6xl leading-none text-accent-primary/30 mb-2 select-none"
              >
                &ldquo;
              </span>
              <blockquote className="text-ink-primary text-[0.9375rem] leading-relaxed mb-6 flex-1">
                {t.quote}
              </blockquote>
              <figcaption className="pt-5 border-t border-line-subtle">
                <div className="font-display text-sm text-ink-primary mb-0.5">
                  {t.attribution}
                </div>
                <div className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-muted">
                  {t.organisation}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
