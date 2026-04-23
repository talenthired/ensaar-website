'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { NeuralBackground } from './NeuralBackground';
import { TypingHeadline } from './TypingHeadline';
import { Button } from '@/components/ui/Button';
import { stagger, fadeUp } from '@/lib/motion';

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-16">
      <NeuralBackground />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.2) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
        }}
        aria-hidden
      />

      <motion.div
        className="relative container-page z-10 text-center max-w-4xl px-6"
        initial={reducedMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-5 py-2 mb-8 bg-accent-primary/10 border border-line-glow rounded-full backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
          </span>
          <span className="font-mono text-[0.8125rem] uppercase tracking-[0.15em] text-accent-secondary">
            Advancing into AI
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] mb-6 text-balance"
        >
          <span className="block">Technology</span>
          <span className="block gradient-text">Meets Design</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-[clamp(1.125rem,2vw,1.5rem)] text-ink-secondary mb-4"
        >
          Building intelligent solutions in <TypingHeadline />
        </motion.p>

        <motion.p
          variants={fadeUp}
          className="max-w-[640px] mx-auto text-lg text-ink-secondary mb-12"
        >
          Ensaar Global is an engineering design and technology services company pioneering AI-powered solutions for modern enterprises.
        </motion.p>

        <motion.div variants={fadeUp} className="flex gap-4 justify-center flex-wrap">
          <Button href="/services" size="lg" withArrow>
            Explore Our Services
          </Button>
          <Button href="/contact" variant="outline" size="lg">
            Get in Touch
          </Button>
        </motion.div>
      </motion.div>

      <motion.a
        href="#below-hero"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted"
        animate={reducedMotion ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Scroll to content"
      >
        <span>Scroll</span>
        <ArrowDown className="h-5 w-5" aria-hidden />
      </motion.a>
    </section>
  );
}
