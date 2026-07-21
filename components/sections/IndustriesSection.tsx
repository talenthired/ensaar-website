'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { DotPattern } from '@/components/ui/DotPattern';
import { INDUSTRIES } from '@/lib/content/trust';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

/**
 * Industries served - clean grid of 8 cards.
 * Number prefix + name + one-line descriptor. No icons, no illustrations.
 * The subtle dot pattern in the background does the visual work.
 */
export function IndustriesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="industries" className="relative overflow-hidden">
      {/* subtle pattern band */}
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] text-accent-primary">
        <DotPattern />
      </div>

      <Container>
        <SectionHeader
          eyebrow="Industries Served"
          title={
            <>
              We work where AI meets <span className="gradient-text">real industry constraints.</span>
            </>
          }
          lede="A decade of delivery across regulated, complex, and fast-moving sectors. Each engagement teaches us where AI changes the equation - and where it doesn't."
        />

        <motion.div
          className="grid gap-px overflow-hidden border border-line-subtle bg-line-subtle/60 md:grid-cols-2 lg:grid-cols-4"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {INDUSTRIES.map((ind, i) => (
            <motion.div
              key={ind.id}
              id={`industry-${ind.id}`}
              variants={fadeUp}
              className="scroll-mt-28 bg-bg-secondary p-6 hover:bg-accent-primary/[0.04] transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="font-mono text-xs text-ink-muted tabular-nums tracking-wider mt-1">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-base md:text-lg font-display text-ink-primary leading-tight flex-1">
                  {ind.name}
                </h3>
              </div>
              <p className="text-[0.875rem] text-ink-secondary leading-relaxed pl-7">
                {ind.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
