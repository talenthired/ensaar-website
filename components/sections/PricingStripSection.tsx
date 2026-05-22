'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { PackageCard } from '@/components/pricing/PackageCard';
import { getFeaturedPrograms } from '@/lib/content/pricing';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

export function PricingStripSection() {
  const featured = getFeaturedPrograms().slice(0, 3);
  const reducedMotion = useReducedMotion();

  return (
    <Section id="pricing-strip">
      <Container>
        <SectionHeader
          eyebrow="Three Paths"
          title={
            <>
              Pick the path that <span className="gradient-text">matches your moment.</span>
            </>
          }
          lede="Community for momentum and peers. Cohort to ship a product in eight weeks. 1:1 coaching once you are already building and need a sparring partner."
        />

        <motion.div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          {featured.map((p) => (
            <motion.div key={p.slug} variants={fadeUp}>
              <PackageCard pkg={p} />
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Button href="/pricing" withArrow>See all programs</Button>
          <Button href="/calculator" variant="outline">Earnings projector</Button>
        </div>
      </Container>
    </Section>
  );
}
