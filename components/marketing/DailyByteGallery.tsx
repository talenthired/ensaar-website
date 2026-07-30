'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
// Imported, not referenced by "/images/dailybyte/...". A string src keeps the
// same URL forever, and Next's image optimiser caches by (url, width, quality)
// without checking whether the file underneath changed, so refreshed
// screenshots kept serving the old bytes. Static imports are content-hashed:
// new bytes, new URL, nothing stale to serve.
import shotAiLearn from '@/public/images/dailybyte/dailybyte-ai-learn.png';
import shotAiJobs from '@/public/images/dailybyte/dailybyte-ai-jobs.png';
import shotDailyCode from '@/public/images/dailybyte/dailybyte-daily-code.png';
import shotAiEvolution from '@/public/images/dailybyte/dailybyte-ai-evolution.png';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  History,
  LayoutGrid,
  MousePointer2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { dailyByteLinks } from '@/lib/dailybyte';
import { cn } from '@/lib/utils';

const VIEWS = [
  {
    id: 'learn',
    label: 'AI Learn',
    icon: BriefcaseBusiness,
    alt: 'DailyByte AI Learn page with role-specific labs and progress signals',
    kicker: 'Learn through doing',
    title: 'AI Learn turns work into guided practice',
    caption: 'Learners choose practical labs, direct AI with tools, submit artifacts, and receive feedback on process and outcome.',
    metric: 'AI Learn labs',
    path: 'daily.byte.ai/learn',
    image: shotAiLearn,
    proof: ['Role-specific labs', 'Guided workspace', 'Outcome feedback'],
  },
  {
    id: 'target',
    label: 'AI Jobs',
    icon: LayoutGrid,
    alt: 'DailyByte AI Jobs role preparation coach with readiness score and modules',
    kicker: 'Prepare for a real job',
    title: 'AI Jobs adapts learning to a job description',
    caption: 'A learner saves a job, then DailyByte™ turns its requirements into skill modules, practice loops, Daily Code paths, and proof artifacts.',
    metric: 'Job target coach',
    path: 'daily.byte.ai/targets',
    image: shotAiJobs,
    proof: ['JD-based learning', 'Start AI Learn lab', 'Set Daily Code path'],
  },
  {
    id: 'dailyCode',
    label: 'Daily Code',
    icon: BarChart3,
    alt: 'DailyByte Daily Code path setup for Python, SQL, Java, TypeScript, and AI work missions',
    kicker: 'Keep fundamentals moving',
    title: 'Daily Code supports the target path',
    caption: 'Learners can choose SQL, Python, Java, TypeScript, or AI work missions and change paths as their target role changes.',
    metric: 'Daily Code path',
    path: 'daily.byte.ai/daily-code',
    image: shotDailyCode,
    proof: ['Path choice', 'Skill progress', 'Career fit'],
  },
  {
    id: 'aiEvolution',
    label: 'AI Evolution',
    icon: History,
    alt: 'DailyByte AI Evolution timeline showing model releases from every major AI lab side by side',
    kicker: 'Stay current',
    title: 'AI Evolution tracks what every lab has shipped',
    caption:
      'A dated timeline of model releases across Anthropic, OpenAI, Google, Meta and others. Every entry carries a source link, and every benchmark figure says who reported it.',
    metric: 'Model timeline',
    path: 'daily.byte.ai/ai-evolution',
    image: shotAiEvolution,
    proof: ['Sourced release dates', 'Benchmarks with provenance', 'Updated as labs ship'],
  },
] as const;

const AUDIENCE_CARDS = [
  {
    title: 'Individuals',
    detail: 'Use AI Learn and AI Jobs to prepare for real roles',
    icon: Users,
  },
  {
    title: 'Enterprises',
    detail: 'Build practical AI capability across roles and teams',
    icon: BarChart3,
  },
  {
    title: 'Campuses',
    detail: 'Move students from generic AI exposure to job-specific proof',
    icon: CheckCircle2,
  },
] as const;

export function DailyByteGallery({ compact = false }: { compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const view = VIEWS[activeIndex]!;

  useEffect(() => {
    if (paused || prefersReducedMotion) return undefined;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % VIEWS.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, [paused, prefersReducedMotion]);

  const selectView = (index: number) => {
    setActiveIndex(index);
    setPaused(true);
  };

  const goTo = (direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + VIEWS.length) % VIEWS.length);
    setPaused(true);
  };

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#081b27] shadow-[0_32px_95px_rgba(0,0,0,0.36)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(89,216,200,0.2),transparent_32%),radial-gradient(circle_at_86%_22%,rgba(245,166,35,0.18),transparent_28%)]" aria-hidden />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:42px_42px]" aria-hidden />

      <div className="relative grid gap-0 lg:grid-cols-[0.35fr_0.65fr]">
        <div className="flex min-h-full flex-col justify-between border-b border-white/10 bg-white/[0.045] p-5 backdrop-blur md:p-7 lg:border-b-0 lg:border-r">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#91e5d7]">
              <Sparkles className="h-3.5 w-3.5 text-[#f5a623]" aria-hidden />
              daily.byte
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={view.id}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="mt-6"
              >
                <div className="font-mono text-xs uppercase tracking-[0.1em] text-[#f5a623]">{view.kicker}</div>
                <h3 className="mt-3 text-2xl leading-tight text-white md:text-3xl">{view.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-emerald-50/75 md:text-base">{view.caption}</p>

                <div className="mt-6 grid gap-2">
                  {view.proof.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-emerald-50/85">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#91e5d7]" aria-hidden />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8">
            <div className="grid gap-2" role="tablist" aria-label="DailyByte product screens">
              {VIEWS.map((item, index) => {
                const Icon = item.icon;
                const active = activeIndex === index;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectView(index)}
                    className={cn(
                      'group flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition',
                      active
                        ? 'border-[#f5a623]/70 bg-[#f5a623] text-[#102d30] shadow-[0_14px_34px_rgba(245,166,35,0.25)]'
                        : 'border-white/10 bg-white/[0.045] text-emerald-50/80 hover:border-white/25 hover:bg-white/[0.08] hover:text-white',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[#102d30]' : 'text-[#91e5d7]')} aria-hidden />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active ? 'bg-[#102d30]' : 'bg-white/25')} aria-hidden />
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={dailyByteLinks.individual} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#102d30] transition hover:-translate-y-0.5 hover:bg-[#f5a623]">
                For Individuals
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a href={dailyByteLinks.enterprise} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                For Enterprises
              </a>
            </div>
          </div>
        </div>

        <div className="relative p-3 sm:p-5 lg:p-7">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-emerald-50/65">
            <div className="flex min-w-0 items-center gap-2">
              <MousePointer2 className="h-4 w-4 shrink-0 text-[#91e5d7]" aria-hidden />
              <span className="truncate">{view.metric}</span>
            </div>
            <div className="flex items-center gap-2">
              {VIEWS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectView(index)}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    activeIndex === index ? 'w-8 bg-[#f5a623]' : 'w-2.5 bg-white/25 hover:bg-white/45',
                  )}
                  aria-label={`Show ${item.label}`}
                />
              ))}
            </div>
          </div>

          <div className={cn('relative overflow-hidden rounded-2xl border border-white/15 bg-black shadow-[0_26px_70px_rgba(0,0,0,0.42)]', compact ? 'aspect-[16/10]' : 'aspect-[16/9]')}>
            <div className="absolute inset-x-0 top-0 z-10 flex h-9 items-center gap-2 border-b border-white/10 bg-[#121712]/90 px-4 backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff605c]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd44]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#00ca4e]" aria-hidden />
              <span className="ml-2 min-w-0 truncate font-mono text-[0.68rem] text-white/55">{view.path}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={view.id}
                initial={{ opacity: 0.25, x: prefersReducedMotion ? 0 : 28, scale: 0.992 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -18, scale: 0.996 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 pt-9"
              >
                <Image
                  src={view.image}
                  alt={view.alt}
                  width={1188}
                  height={768}
                  className="h-full w-full object-cover object-left-top"
                  priority={activeIndex === 0}
                />
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={() => goTo(-1)}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
              aria-label="Previous DailyByte screen"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
              aria-label="Next DailyByte screen"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {AUDIENCE_CARDS.map(({ title, detail, icon: Icon }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/[0.045] p-4 text-sm text-emerald-50/75 backdrop-blur">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Icon className="h-4 w-4 text-[#91e5d7]" aria-hidden />
                  {title}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-emerald-50/65">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
