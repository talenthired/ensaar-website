'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Calculator } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { fadeUp, viewportOnce } from '@/lib/motion';

export function CalculatorPreviewSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="calculator-preview">
      <Container>
        <motion.div
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeUp}
          className="glass-strong rounded-3xl p-10 md:p-14 grid gap-10 md:grid-cols-[1.4fr_1fr] items-center"
        >
          <div>
            <span className="eyebrow mb-5">Free cost review</span>
            <h2 className="text-3xl md:text-4xl mt-5 mb-4 text-balance leading-tight">
              See what AI can reduce <span className="gradient-text">before the first call.</span>
            </h2>
            <p className="text-ink-secondary text-lg mb-8 max-w-xl">
              Enter your current spend, team size, and AI-ready workload. The calculator turns that into a projected monthly saving and a recommended first pod.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button href="/calculator" size="lg" withArrow>
                Run the calculator
              </Button>
              <Button href="/contact" variant="outline" size="lg">
                Submit work for review
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tile label="Monthly savings" value="$13,440" emphasis />
            <Tile label="Annual savings" value="$161K" />
            <Tile label="Hours freed / mo" value="350+" />
            <Tile label="Cost per hour" value="80% less" />
            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-line-subtle bg-bg-secondary p-4">
              <Calculator className="h-5 w-5 text-accent-primary" aria-hidden />
              <span className="text-sm text-ink-secondary">
                Sample for a 4-person team at $20K/month spend with 60% AI-ready delivery work.
              </span>
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}

function Tile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line-subtle bg-bg-secondary p-4 flex flex-col">
      <div className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </div>
      <div
        className={
          emphasis
            ? 'mt-2 font-display text-2xl gradient-text'
            : 'mt-2 font-display text-2xl text-ink-primary'
        }
      >
        {value}
      </div>
    </div>
  );
}
