'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import { AI_CASES } from '@/lib/content/cases';

type Props = {
  showHeader?: boolean;
  limit?: number;
};

/**
 * Case studies presented as enterprise-style content cards.
 * No illustrations - typography, region badge, clear hierarchy, clean accent line.
 */
export function AICaseStudiesSection({ showHeader = true, limit }: Props) {
  const reducedMotion = useReducedMotion();
  const cases = limit ? AI_CASES.slice(0, limit) : AI_CASES;

  return (
    <Section id="case-studies">
      <Container>
        {showHeader && (
          <SectionHeader
            eyebrow="Selected Engagements"
            title={
              <>
                AI in production. <span className="gradient-text">Across continents.</span>
              </>
            }
            lede="A snapshot of recent engagements where Ensaar threaded AI through the customer experience - from trading desks in Singapore to ride-hailing in the UAE."
          />
        )}

        <motion.div
          className="grid gap-5 md:grid-cols-2"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {cases.map((c) => (
            <motion.article
              key={c.id}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className="group relative bg-bg-secondary border border-line-subtle rounded-2xl p-8 hover:border-line-glow hover:shadow-card transition-all overflow-hidden"
            >
              {/* top accent line - Scadea-style */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-brand opacity-80" />

              {/* region row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center min-w-[34px] h-[22px] px-2 rounded-md bg-accent-primary/[0.08] border border-line-subtle font-mono text-[0.6875rem] font-semibold tracking-[0.1em] text-accent-secondary">
                    {c.flag}
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-muted">
                    {c.region}
                  </span>
                </div>
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-muted">
                  {c.client}
                </span>
              </div>

              <h3 className="text-xl md:text-[1.375rem] font-display mb-3 text-ink-primary text-balance leading-tight">
                {c.title}
              </h3>

              <p className="text-ink-secondary text-[0.9375rem] leading-relaxed mb-6">
                {c.summary}
              </p>

              <ul className="flex flex-col gap-2.5 mb-6 pl-0">
                {c.highlights.slice(0, 3).map((h) => (
                  <li key={h} className="flex items-start gap-3 text-[0.9375rem] text-ink-secondary">
                    <span className="mt-[0.55rem] h-[2px] w-3 rounded-sm bg-gradient-brand shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 pt-5 border-t border-line-subtle">
                <div className="flex flex-wrap gap-2">
                  {c.tech.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] px-2.5 py-1 rounded-full bg-bg-tertiary border border-line-subtle text-ink-secondary"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-accent-primary/[0.08] border border-line-subtle text-accent-primary group-hover:bg-gradient-brand group-hover:border-transparent group-hover:text-white transition-all shrink-0"
                  aria-label={`Discuss a similar engagement to ${c.title}`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <p className="text-center text-sm text-ink-muted mt-10">
          Client names are confidential. Engagement details available on request.
        </p>
      </Container>
    </Section>
  );
}
