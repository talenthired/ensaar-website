'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import { AI_CASES } from '@/lib/content/cases';

type Props = {
  showHeader?: boolean;
  limit?: number;
};

export function AICaseStudiesSection({ showHeader = true, limit }: Props) {
  const reducedMotion = useReducedMotion();
  const cases = limit ? AI_CASES.slice(0, limit) : AI_CASES;

  return (
    <Section id="case-studies" className="bg-bg-primary">
      <Container>
        {showHeader && (
          <SectionHeader
            eyebrow="Selected Engagements"
            title={
              <>
                Technology applied to <span className="gradient-text">real operating contexts.</span>
              </>
            }
            lede="An anonymized view of international work across trading, learning, marketing, and mobility. Client identities remain confidential."
          />
        )}

        <motion.div
          className="border-t border-line-subtle"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {cases.map((item, index) => (
            <motion.article
              key={item.id}
              variants={fadeUp}
              className="group grid gap-6 border-b border-line-subtle py-9 lg:grid-cols-[0.65fr_1.15fr_1fr_auto] lg:items-start lg:gap-10 lg:py-11"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-accent-secondary">{String(index + 1).padStart(2, '0')}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-muted">{item.region}</span>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.08em] text-ink-muted">{item.client}</p>
              </div>

              <div>
                <h3 className="text-2xl leading-tight md:text-3xl">{item.title}</h3>
                <p className="mt-4 leading-relaxed text-ink-secondary">{item.summary}</p>
                <p className="mt-5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-accent-secondary">
                  {item.tech.slice(0, 3).join(' / ')}
                </p>
              </div>

              <ul className="space-y-4">
                {item.highlights.slice(0, 3).map((highlight) => (
                  <li key={highlight} className="border-l-2 border-accent-cyan pl-4 text-sm leading-relaxed text-ink-secondary">
                    {highlight}
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className="flex h-11 w-11 items-center justify-center border border-line-subtle text-accent-primary transition hover:border-accent-primary hover:bg-accent-primary hover:text-white"
                aria-label={`Discuss a similar engagement to ${item.title}`}
              >
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </motion.article>
          ))}
        </motion.div>

        <p className="mt-8 text-sm text-ink-muted">Client names are confidential. Additional context is available during a qualified conversation.</p>
      </Container>
    </Section>
  );
}
