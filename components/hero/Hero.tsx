'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check, ScanSearch, ShieldCheck } from 'lucide-react';
import { AdvisorTrigger } from '@/components/marketing/AdvisorTrigger';
import { fadeUp, stagger } from '@/lib/motion';
import { EOR_PRICE_USD } from '@/lib/content/india';

const PROOF = [
  ['Since 2014', 'Technology and capability delivery'],
  [`Starts from $${EOR_PRICE_USD}`, 'Per employee, per month'],
  ['5 to 10 days', 'Typical time to a first working day'],
  ['DailyByte™', 'AI Learn and AI Jobs paths'],
] as const;

/* What Ensaar absorbs when it is the employer. This replaced a product
   screenshot: the hero now sells an India team rather than the AI platform, and
   a picture of DailyByte alongside that headline argued with it. */
const CARRIED = [
  'The employment contract, under Indian law',
  'Payroll in rupees, every month',
  'Professional tax, TDS, and ESI where it applies',
  'Gratuity accrual, leave, and a lawful exit',
] as const;

export function Hero() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#071a34] pb-14 pt-24 text-white md:pb-18 md:pt-32 lg:min-h-[720px] lg:pt-36">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-brand" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" aria-hidden />
        <div className="absolute right-0 top-0 h-full w-[55%] bg-[#102d30] max-lg:hidden" aria-hidden />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" aria-hidden />

        <div className="container-page relative grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="relative z-10 max-w-2xl">
            <motion.div variants={fadeUp} className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.11em] text-cyan-200">
              <span className="h-px w-10 bg-[#f5a623]" aria-hidden />
              Employer of Record + capability centres in India
            </motion.div>

            <motion.h1 variants={fadeUp} className="max-w-[620px] text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance">
              Build your team in India, without building a company.
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-slate-200">
              Ensaar employs your India hires as the legal employer, runs payroll and every statutory
              filing, and grows the team into your own capability centre when the numbers justify it.
              You manage the work. We carry India.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <a
                href="/services/employer-of-record"
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-[#f5a623] px-7 py-4 text-base font-semibold text-[#0c2343] transition hover:-translate-y-0.5 hover:bg-[#f7b83e]"
              >
                Hire in India
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <a
                href="/services/gcc"
                className="group inline-flex items-center justify-center gap-2 rounded-md border border-white/35 bg-white/[0.04] px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Build a team
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <AdvisorTrigger intent="enterprise" source="hero-enterprise" variant="text" className="px-2 py-4 text-white hover:text-[#59d8c8]">
                Something else
              </AdvisorTrigger>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-7 flex items-center gap-3 text-sm text-slate-300">
              <ScanSearch className="h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />
              <span>Unsure which you need? EnAI Navigator routes you to the right conversation in two questions.</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:pl-4 xl:-mr-8"
          >
            <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-emerald-100/70">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#f5a623]" aria-hidden /> What we take on</span>
              <span>As your employer of record</span>
            </div>
            <div className="border border-white/15 bg-black/25 p-7 shadow-[0_35px_90px_rgba(0,0,0,0.38)] backdrop-blur-sm md:p-9">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-emerald-100/75">starts from</span>
                <span className="font-display text-[3rem] leading-none text-white">${EOR_PRICE_USD}</span>
                <span className="text-sm text-emerald-100/75">per employee, per month</span>
              </div>
              <p className="mt-3 text-sm text-emerald-100/75">
                No setup fee, no minimum term, and a refundable one-month deposit. Salary and
                statutory costs are passed through at cost.
              </p>
              <ul className="mt-7 flex flex-col gap-3 border-t border-white/15 pt-6">
                {CARRIED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[0.9375rem] text-slate-200">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#59d8c8]" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              <div className="border-l-2 border-[#59d8c8] pl-3"><span className="block font-semibold text-white">Employ</span><span className="mt-1 block text-emerald-100/60">Without an entity</span></div>
              <div className="border-l-2 border-[#f5a623] pl-3"><span className="block font-semibold text-white">Grow</span><span className="mt-1 block text-emerald-100/60">Pod to centre</span></div>
              <div className="hidden border-l-2 border-cyan-300 pl-3 sm:block"><span className="block font-semibold text-white">Convert</span><span className="mt-1 block text-emerald-100/60">Into your entity</span></div>
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
