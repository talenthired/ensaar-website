'use client';

import { motion, useReducedMotion, useInView, animate, useMotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Section, SectionHeader } from '@/components/ui/Section';
import { fadeLeft, stagger, viewportOnce } from '@/lib/motion';

const TIMELINE = [
  {
    year: '2014',
    title: 'Founded',
    body: 'Established as an engineering design and technology services company, backed by two decades of experience in IT and consumer product design.',
    active: false,
  },
  {
    year: '2014 — 2023',
    title: 'Delivery Across Industries',
    body: 'Successfully delivered IT projects, business communications training, trading and loyalty platforms, and robotics education programs across multiple industries.',
    active: false,
  },
  {
    year: '2024 — Present',
    title: 'The AI Advance',
    body: 'Actively building AI-powered implementations using Claude, Claude Code, and its ecosystem of plugins and skills — transforming how our clients operate.',
    active: true,
  },
];

const STATS = [
  { label: 'Years of Delivery', value: 10, suffix: '+' },
  { label: 'Industries Served', value: 5, suffix: '+' },
  { label: 'AI-First Approach', value: 100, suffix: '%' },
];

export function AboutSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Section id="about">
      <Container>
        <SectionHeader
          eyebrow="About"
          title={
            <>
              Two Decades of Expertise. <span className="gradient-text">AI-First Future.</span>
            </>
          }
          lede="We combine deep experience in information technology and consumer product engineering with modern AI capabilities to deliver solutions that move businesses forward."
        />

        <motion.div
          className="relative max-w-[780px] mx-auto mb-20"
          initial={reducedMotion ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
        >
          <div className="absolute left-[20px] top-5 bottom-5 w-[2px] bg-gradient-to-b from-accent-primary to-accent-cyan opacity-30" />
          {TIMELINE.map((item) => (
            <motion.div key={item.title} variants={fadeLeft} className="relative pl-16 pb-8 last:pb-0">
              <div
                className={`absolute left-[11px] top-5 w-5 h-5 rounded-full border-2 ${
                  item.active
                    ? 'bg-gradient-brand border-transparent shadow-[0_0_20px_rgba(99,102,241,1)]'
                    : 'bg-bg-primary border-accent-primary'
                }`}
              />
              <div
                className={`rounded-2xl p-7 backdrop-blur-md border transition-all hover:translate-x-1 ${
                  item.active
                    ? 'border-line-glow bg-gradient-to-br from-accent-primary/[0.08] to-accent-cyan/[0.06]'
                    : 'border-line-subtle bg-bg-glass hover:border-line-glow'
                }`}
              >
                <span className="inline-block font-mono text-[0.8125rem] text-accent-cyan-soft mb-2 tracking-wide">
                  {item.year}
                </span>
                <h3 className="text-[1.375rem] mb-2">{item.title}</h3>
                <p className="text-ink-secondary text-[0.9375rem]">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3 max-w-[780px] mx-auto">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reducedMotion = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setDisplay(`${value}${suffix || ''}`);
      return;
    }
    const controls = animate(mv, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(`${Math.round(v)}${suffix || ''}`),
    });
    return () => controls.stop();
  }, [inView, value, suffix, reducedMotion, mv]);

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="text-center p-8 bg-bg-glass border border-line-subtle rounded-2xl backdrop-blur-md hover:border-line-glow hover:shadow-glow transition-all"
    >
      <div className="font-display text-[clamp(2.25rem,5vw,3.5rem)] gradient-text mb-2">{display}</div>
      <div className="font-mono text-[0.8125rem] text-ink-secondary uppercase tracking-[0.1em]">{label}</div>
    </motion.div>
  );
}
