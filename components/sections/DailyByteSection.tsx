'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Eye, Gauge, ShieldCheck } from 'lucide-react';
import { DailyByteGallery } from '@/components/marketing/DailyByteGallery';
import { Container } from '@/components/ui/Container';
import { dailyByteLinks } from '@/lib/dailybyte';
import { fadeUp, stagger, viewportOnce } from '@/lib/motion';

const MEASURES = [
  {
    icon: Eye,
    title: 'Process',
    detail: 'How the person frames, directs, checks, and improves the AI-assisted work.',
  },
  {
    icon: Gauge,
    title: 'Outcome',
    detail: 'Whether the submitted artifact is correct, complete, and fit for the brief.',
  },
  {
    icon: ShieldCheck,
    title: 'Judgment',
    detail: 'Whether the person recognizes uncertainty, risk, and the need for verification.',
  },
] as const;

export function DailyByteSection() {
  const reducedMotion = useReducedMotion();
  // This section carried no motion at all: the product gallery inside it
  // rotates, but everything around it, including the three evaluation measures
  // and the four-step summary, arrived fully formed and never moved again. The
  // grids below now come in as rows, which is what makes a long page feel like
  // it is being read rather than scrolled past.
  const revealGrid = {
    initial: reducedMotion ? 'visible' : 'hidden',
    whileInView: 'visible' as const,
    viewport: viewportOnce,
    variants: stagger,
  };
  return (
    <section id="dailybyte" className="overflow-hidden bg-[#102d30] py-20 text-white md:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#91e5d7]">
              <span className="h-px w-8 bg-[#f5a623]" aria-hidden />
              Practical AI work platform
            </div>
            <h2 className="mt-6 text-[clamp(2.5rem,5vw,4.8rem)] leading-[1.01] text-balance">
              See how AI Learn and AI Jobs turn intent into practice.
            </h2>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <div className="font-mono text-sm text-[#f5a623]">daily.byte AI Learn + AI Jobs</div>
            <p className="mt-4 text-lg leading-relaxed text-emerald-50/80">
              DailyByte<sup className="align-super text-[0.6em] font-medium leading-none">™</sup> gives individuals a guided AI Learn path and job-specific AI Jobs preparation, while enterprises can use the same operating model to build practical AI capability across teams and cohorts.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={dailyByteLinks.individual} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-md bg-[#f5a623] px-6 py-3.5 text-sm font-semibold text-[#0c2343] transition hover:-translate-y-0.5 hover:bg-[#f7b83e]">
                For Individuals <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <a href={dailyByteLinks.enterprise} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-md border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                For Enterprises <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <Link href="/ai-work-lab" className="group inline-flex items-center gap-2 rounded-md border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">
                See how it works <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14">
          <DailyByteGallery />
        </div>

        <motion.div className="mt-12 grid border-l border-t border-white/15 md:grid-cols-3" {...revealGrid}>
          {MEASURES.map(({ icon: Icon, title, detail }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              className="group border-b border-r border-white/15 p-6 transition-colors hover:bg-white/[0.04] md:p-8"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-[#91e5d7]" aria-hidden />
                <h3 className="text-lg text-white">{title}</h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-emerald-50/70">{detail}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="mt-12 grid gap-5 border-y border-white/15 py-7 sm:grid-cols-2 lg:grid-cols-4" {...revealGrid}>
          {[
            'Start AI Learn with realistic work labs',
            'Use AI Jobs to learn from a job description',
            'Set a Daily Code path aligned to the target role',
            'Track proof, readiness, and team capability signals',
          ].map((item, index) => (
            <motion.div key={item} variants={fadeUp} className="flex items-start gap-3 text-sm leading-relaxed text-emerald-50/80">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5a623] text-[#102d30]">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span><span className="font-mono text-xs text-[#91e5d7]">0{index + 1}</span><br />{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
