'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Check, ScanSearch, Sparkles } from 'lucide-react';
import { AdvisorTrigger } from '@/components/marketing/AdvisorTrigger';
import { trackEvent } from '@/lib/analytics';
import { dailyByteLinks } from '@/lib/dailybyte';
import { fadeUp, stagger } from '@/lib/motion';

const PROOF = [
  ['Since 2014', 'Technology and capability delivery'],
  ['AI pilots', 'Controlled workflow implementation'],
  ['DailyByte™', 'AI Learn and AI Target paths'],
  ['BCEP', 'Certified AI-ready capability'],
] as const;

export function Hero() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#071a34] pb-14 pt-24 text-white md:pb-18 md:pt-32 lg:min-h-[720px] lg:pt-36">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-brand" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" aria-hidden />
        <div className="absolute right-0 top-0 h-full w-[55%] bg-[#102d30] max-lg:hidden" aria-hidden />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" aria-hidden />

        <div className="container-page relative grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 max-w-2xl">
            <motion.div variants={fadeUp} className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.11em] text-cyan-200">
              <span className="h-px w-10 bg-[#f5a623]" aria-hidden />
              Enterprise AI adoption + workforce enablement
            </motion.div>

            <motion.h1 variants={fadeUp} className="max-w-[620px] text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance">
              Turn AI into work your teams can trust.
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-slate-200">
              Ensaar helps organizations identify high-value AI workflows, build controlled pilots, and enable people to use AI with evidence, judgment, and measurable output.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a
                href={dailyByteLinks.individual}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent('hero_cta_clicked', { destination: 'dailybyte-individual' })}
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-[#f5a623] px-7 py-4 text-base font-semibold text-[#0c2343] transition hover:-translate-y-0.5 hover:bg-[#f7b83e]"
              >
                For Individuals
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <a
                href={dailyByteLinks.enterprise}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackEvent('hero_cta_clicked', { destination: 'dailybyte-enterprise' })}
                className="group inline-flex items-center justify-center gap-2 rounded-md border border-white/35 bg-white/[0.04] px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                For Enterprises
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <AdvisorTrigger intent="enterprise" source="hero-enterprise" variant="text" className="px-2 py-4 text-white hover:text-[#59d8c8]">
                Plan my AI pilot
              </AdvisorTrigger>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-7 flex items-center gap-3 text-sm text-slate-300">
              <ScanSearch className="h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />
              <span>Unsure where to start? EnAI Navigator routes you to the right product or conversation in two questions.</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:pl-4 xl:-mr-8"
          >
            <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-emerald-100/70">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#f5a623]" aria-hidden /> AI adoption in practice</span>
              <span>AI Learn + AI Target</span>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden border border-white/15 bg-[#0d0f0c] shadow-[0_35px_90px_rgba(0,0,0,0.38)] lg:aspect-[16/9.6]">
              <Image
                src="/images/dailybyte/dailybyte-ai-target.png"
                alt="DailyByte AI Target job-specific learning coach"
                width={1188}
                height={768}
                priority
                className="h-full w-full object-cover object-left-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 to-transparent" aria-hidden />
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2">
                {['AI Target', 'Start AI Learn lab', 'Set Daily Code path'].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[0.6875rem] font-semibold text-white backdrop-blur">
                    <Check className="h-3 w-3 text-[#59d8c8]" aria-hidden />{label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div className="border-l-2 border-[#59d8c8] pl-3"><span className="block font-semibold text-white">Implement</span><span className="mt-1 block text-emerald-100/60">Ship a pilot</span></div>
              <div className="border-l-2 border-[#f5a623] pl-3"><span className="block font-semibold text-white">Enable</span><span className="mt-1 block text-emerald-100/60">Practice safely</span></div>
              <div className="hidden border-l-2 border-cyan-300 pl-3 sm:block"><span className="block font-semibold text-white">Measure</span><span className="mt-1 block text-emerald-100/60">Prove readiness</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      <section aria-label="Ensaar at a glance" className="border-b border-line-subtle bg-bg-secondary">
        <div className="container-page grid grid-cols-2 lg:grid-cols-4">
          {PROOF.map(([value, label], index) => (
            <div key={value} className={`min-w-0 border-r border-line-subtle px-4 py-5 last:border-r-0 md:px-6 ${index === 0 ? 'bg-[#f5a623] text-[#0c2343]' : ''}`}>
              <div className="font-display text-lg md:text-xl">{value}</div>
              <div className={`mt-1 text-xs leading-relaxed ${index === 0 ? 'text-[#0c2343]/75' : 'text-ink-muted'}`}>{label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
