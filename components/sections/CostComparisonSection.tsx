'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { ComparisonTable } from '@/components/pricing/ComparisonTable';
import { fadeUp, viewportOnce } from '@/lib/motion';

export function CostComparisonSection() {
  const reducedMotion = useReducedMotion();
  return (
    <Section id="cost-comparison" className="bg-bg-secondary">
      <Container>
        <SectionHeader
          eyebrow="Cost Reduction Engine"
          title={
            <>
              The win is not a low rate. <span className="gradient-text">It is lower cost per outcome.</span>
            </>
          }
          lede="AI changes the delivery equation. Ensaar combines lower-cost execution capacity, senior oversight, reusable AI workflows, and transparent tracking so clients pay less for shipped work."
        />

        <motion.div
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
        >
          <ComparisonTable />
        </motion.div>

        <div className="mt-10 flex justify-center">
          <Button href="/calculator" withArrow>
            Calculate your savings
          </Button>
        </div>
      </Container>
    </Section>
  );
}
