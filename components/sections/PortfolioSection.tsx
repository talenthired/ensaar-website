'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { CASE_STUDIES } from '@/lib/content/portfolio';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';
import { cn } from '@/lib/utils';

export function PortfolioSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="portfolio">
      <Container>
        <SectionHeader
          eyebrow="Selected Work"
          title={
            <>
              Impact Across <span className="gradient-text">Industries</span>
            </>
          }
          lede="A decade of shipped solutions. Client names are confidential — engagement details available on request."
        />

        <motion.div
          className="grid gap-6 md:grid-cols-2"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {CASE_STUDIES.map((study) => (
            <motion.article
              key={study.id}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className={cn(
                'relative p-8 rounded-2xl backdrop-blur-md overflow-hidden transition-all',
                study.accent
                  ? 'bg-gradient-to-br from-accent-primary/[0.08] to-accent-cyan/[0.04] border border-line-glow'
                  : 'bg-bg-glass border border-line-subtle hover:border-line-glow hover:shadow-glow',
              )}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-brand opacity-80" />
              <p className="font-mono text-xs tracking-[0.15em] uppercase text-accent-cyan-soft mb-3">
                {study.industry}
              </p>
              <h3 className="text-[1.375rem] mb-4 leading-tight">{study.title}</h3>
              <p className="text-ink-secondary text-[0.9375rem] mb-5">{study.description}</p>
              <div className="flex flex-wrap gap-2">
                {study.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      'font-mono text-xs px-3 py-1 rounded-full border',
                      study.accent
                        ? 'border-line-glow text-accent-secondary bg-accent-primary/[0.12]'
                        : 'border-line-subtle text-ink-secondary bg-accent-primary/[0.05]',
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
