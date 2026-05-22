'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { NeuralBackground } from './NeuralBackground';
import { TypingHeadline } from './TypingHeadline';
import { Button } from '@/components/ui/Button';
import { HeroImage } from '@/components/ui/HeroImage';
import { stagger, fadeUp } from '@/lib/motion';

export function Hero() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-28 pb-20">
      {/* very subtle neural background */}
      <div className="absolute inset-0 -z-10 opacity-50">
        <NeuralBackground />
      </div>

      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.18) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(6, 182, 212, 0.12) 0%, transparent 50%)',
        }}
        aria-hidden
      />

      <div className="container-page relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <motion.div
            initial={reducedMotion ? 'visible' : 'hidden'}
            animate="visible"
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 px-5 py-2 mb-8 bg-accent-primary/10 border border-line-glow rounded-full backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
              </span>
              <span className="font-mono text-[0.8125rem] uppercase tracking-[0.15em] text-accent-secondary">
                Managed AI execution pods
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.98] mb-6 text-balance"
            >
              <span className="block">Show us the work.</span>
              <span className="block gradient-text">We show what AI can reduce.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-[clamp(1.125rem,1.6vw,1.375rem)] text-ink-secondary mb-4"
            >
              Reduce cost across <TypingHeadline />
            </motion.p>

            <motion.p
              variants={fadeUp}
              className="max-w-[560px] text-base md:text-lg text-ink-secondary mb-10"
            >
              Ensaar turns software backlogs, support queues, research tasks, process bottlenecks, and staffing gaps into managed AI execution pods with senior human oversight.
            </motion.p>

            <motion.div variants={fadeUp} className="flex gap-4 flex-wrap">
              <Button href="/contact" size="lg" withArrow>
                Get My AI Cost Reduction Plan
              </Button>
              <Button href="/pricing" variant="outline" size="lg">
                Explore Managed AI Pods
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="hidden lg:block"
          >
            <HeroImage
              src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1400&q=80&auto=format&fit=crop"
              alt="Abstract visualization of AI and intelligent systems"
              tint="brand"
              className="aspect-[5/6]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
