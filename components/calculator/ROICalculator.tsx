'use client';

import { useMemo, useState } from 'react';
import { Mail, TrendingDown, Zap, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const HOURS_PER_MONTH = 160;
const ENSAAR_ENTRY_RATE = 7;
const PRODUCTIVITY_MULTIPLIER = 2.2;

type Inputs = {
  monthlySpendUsd: number;
  teamSize: number;
  aiAugmentablePct: number;
};

type Result = {
  blendedRateUsd: number;
  aiAugHours: number;
  monthlySavingsUsd: number;
  annualSavingsUsd: number;
  costReductionPct: number;
  hoursFreedPerMonth: number;
};

function computeResult({ monthlySpendUsd, teamSize, aiAugmentablePct }: Inputs): Result {
  const totalHours = teamSize * HOURS_PER_MONTH;
  const blendedRateUsd = teamSize > 0 ? monthlySpendUsd / totalHours : 0;
  const aiAugHours = totalHours * (aiAugmentablePct / 100);
  const currentAiAugCost = aiAugHours * blendedRateUsd;
  const ensaarAiAugCost = aiAugHours * ENSAAR_ENTRY_RATE;
  const monthlySavingsUsd = Math.max(currentAiAugCost - ensaarAiAugCost, 0);
  const annualSavingsUsd = monthlySavingsUsd * 12;
  const costReductionPct =
    blendedRateUsd > 0 ? Math.round(((blendedRateUsd - ENSAAR_ENTRY_RATE) / blendedRateUsd) * 100) : 0;
  const hoursFreedPerMonth = aiAugHours * (1 - 1 / PRODUCTIVITY_MULTIPLIER);
  return {
    blendedRateUsd,
    aiAugHours,
    monthlySavingsUsd,
    annualSavingsUsd,
    costReductionPct,
    hoursFreedPerMonth,
  };
}

const fmtUsd = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');

const fmtHours = (n: number) =>
  Math.round(n).toLocaleString('en-US') + ' hrs';

export function ROICalculator() {
  const [monthlySpendUsd, setMonthlySpendUsd] = useState(20000);
  const [teamSize, setTeamSize] = useState(4);
  const [aiAugmentablePct, setAiAugmentablePct] = useState(60);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const result = useMemo(
    () => computeResult({ monthlySpendUsd, teamSize, aiAugmentablePct }),
    [monthlySpendUsd, teamSize, aiAugmentablePct],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Step 5 wires this to /api/calculator. For now, optimistic UI only.
    setSubmitted(true);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] items-start">
      {/* Inputs */}
      <div className="glass rounded-3xl p-8">
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-accent-secondary mb-6">
          Your situation
        </div>

        <div className="flex flex-col gap-7">
          <Field
            id="monthly-spend"
            label="Current monthly engineering spend (USD)"
            help="Salaries plus contractors plus any outsourced engineering. Approximate is fine."
          >
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted text-sm">$</span>
              <input
                id="monthly-spend"
                type="number"
                inputMode="numeric"
                min={1000}
                step={1000}
                value={monthlySpendUsd}
                onChange={(e) => setMonthlySpendUsd(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl border border-line-subtle bg-bg-secondary py-3 pl-8 pr-4 text-ink-primary text-lg font-display focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-colors"
              />
            </div>
          </Field>

          <Field
            id="team-size"
            label="Engineers on the team"
            help="Full-time-equivalent. If you have part-timers, fractional counts are fine."
          >
            <input
              id="team-size"
              type="number"
              inputMode="numeric"
              min={1}
              max={500}
              step={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border border-line-subtle bg-bg-secondary py-3 px-4 text-ink-primary text-lg font-display focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-colors"
            />
          </Field>

          <Field
            id="ai-aug-pct"
            label={`Work suitable for AI augmentation: ${aiAugmentablePct}%`}
            help="Boilerplate, CRUD, integration glue, scaffolding, tests, docs. Most teams say 50-70%."
          >
            <input
              id="ai-aug-pct"
              type="range"
              min={20}
              max={90}
              step={5}
              value={aiAugmentablePct}
              onChange={(e) => setAiAugmentablePct(Number(e.target.value))}
              className="w-full accent-[rgb(var(--color-accent-primary))]"
            />
            <div className="flex justify-between text-[0.6875rem] font-mono text-ink-muted mt-1">
              <span>20%</span>
              <span>50%</span>
              <span>90%</span>
            </div>
          </Field>
        </div>

        <div className="mt-8 pt-6 border-t border-line-subtle text-xs text-ink-muted leading-relaxed">
          Math is shown live and based on Ensaar entry execution capacity inside a managed AI pod. We cap the
          productivity multiplier at {PRODUCTIVITY_MULTIPLIER}x so the estimate stays conservative.
        </div>
      </div>

      {/* Outputs */}
      <div className="glass-strong rounded-3xl p-8">
        <div className="font-mono text-xs uppercase tracking-[0.15em] text-accent-secondary mb-6">
          Your result
        </div>

        <ResultRow
          Icon={DollarSign}
          accent="text-accent-primary"
          label="Estimated monthly savings"
          value={fmtUsd(result.monthlySavingsUsd)}
          big
        />
        <ResultRow
          Icon={TrendingDown}
          accent="text-accent-cyan"
          label="Annual savings"
          value={fmtUsd(result.annualSavingsUsd)}
        />
        <ResultRow
          Icon={Zap}
          accent="text-emerald-500"
          label="Cost-per-hour reduction"
          value={`${result.costReductionPct}%`}
        />
        <ResultRow
          Icon={Zap}
          accent="text-amber-500"
          label="Engineering hours freed per month"
          value={fmtHours(result.hoursFreedPerMonth)}
          help="Productivity gain on the AI-augmentable portion, modeled at 2.2x output."
        />

        <div className="mt-8 pt-6 border-t border-line-subtle">
          <div className="font-mono text-[0.6875rem] uppercase tracking-[0.15em] text-ink-muted mb-3">
            Your blended rate
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-display text-2xl">
              {fmtUsd(result.blendedRateUsd)}
              <span className="text-ink-muted text-sm">/hr</span>
            </span>
            <span className="text-ink-muted text-sm">to</span>
            <span className="font-display text-2xl gradient-text">
              ${ENSAAR_ENTRY_RATE}
              <span className="text-ink-muted text-sm">/hr managed entry tier</span>
            </span>
          </div>
        </div>

        {/* Email capture */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 pt-6 border-t border-line-subtle"
        >
          <label
            htmlFor="calc-email"
            className="font-display text-lg flex items-center gap-2 mb-2"
          >
            <Mail className="h-5 w-5 text-accent-primary" aria-hidden />
            Email me this analysis
          </label>
          <p className="text-xs text-ink-muted mb-4">
            We'll send a one-page PDF with these numbers and a recommended first engagement. No follow-up
            spam.
          </p>
          {submitted ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Thanks. We've logged your analysis and will send it shortly to{' '}
              <span className="font-mono">{email}</span>.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                id="calc-email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-line-subtle bg-bg-secondary py-3 px-4 text-ink-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 transition-colors"
              />
              <button
                type="submit"
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 px-6 py-3 text-[0.9375rem] whitespace-nowrap',
                  'bg-gradient-brand text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_8px_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5',
                )}
              >
                Email it
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/contact" variant="outline">
            Talk to a senior engineer
          </Button>
          <Button href="/pricing" variant="ghost">
            See packages to
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-display text-base mb-2">
        {label}
      </label>
      {children}
      {help && <p className="mt-2 text-xs text-ink-muted leading-relaxed">{help}</p>}
    </div>
  );
}

function ResultRow({
  Icon,
  accent,
  label,
  value,
  help,
  big,
}: {
  Icon: typeof DollarSign;
  accent: string;
  label: string;
  value: string;
  help?: string;
  big?: boolean;
}) {
  return (
    <div className="py-4 border-b border-line-subtle last:border-b-0 flex items-start gap-4">
      <span className={cn('mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-secondary border border-line-subtle', accent)}>
        <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-secondary">{label}</div>
        <div
          className={cn(
            'font-display mt-0.5',
            big ? 'text-[2.5rem] leading-none gradient-text' : 'text-2xl text-ink-primary',
          )}
        >
          {value}
        </div>
        {help && <div className="mt-1 text-xs text-ink-muted">{help}</div>}
      </div>
    </div>
  );
}
