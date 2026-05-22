import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { GradientBorder } from '@/components/ui/GradientBorder';
import type { Program, Accent, Currency } from '@/lib/content/pricing';
import { formatPrice } from '@/lib/content/currency';
import { cn } from '@/lib/utils';

const ACCENT_TEXT: Record<Accent, string> = {
  indigo: 'text-accent-primary',
  cyan: 'text-accent-cyan',
  violet: 'text-accent-secondary',
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
};

export type PackageCardProps = {
  pkg: Program;
  variant?: 'grid' | 'compact';
  currency?: Currency;
  className?: string;
};

export function PackageCard({ pkg, variant = 'grid', currency = 'USD', className }: PackageCardProps) {
  const compact = variant === 'compact';
  const accent = ACCENT_TEXT[pkg.accent];
  const price = formatPrice(pkg.price, currency);

  return (
    <GradientBorder className={cn('h-full', className)}>
      <article className={cn('flex h-full flex-col', compact ? 'p-7' : 'p-9')}>
        {pkg.featured && !compact && (
          <span className="self-start mb-4 inline-flex items-center rounded-full bg-accent-primary/15 border border-accent-primary/40 px-3 py-1 text-[0.6875rem] font-mono uppercase tracking-[0.15em] text-accent-primary">
            Featured
          </span>
        )}

        <div className={cn('font-mono text-xs uppercase tracking-[0.15em]', accent)}>
          {pkg.duration}
        </div>

        <h3 className={cn('mt-3', compact ? 'text-xl' : 'text-2xl md:text-[1.625rem]')}>
          {pkg.name}
        </h3>

        <p className="mt-3 text-ink-secondary text-[0.9375rem] leading-relaxed">
          {compact ? pkg.headline : pkg.description}
        </p>

        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="font-display text-[2.5rem] leading-none gradient-text">
            {price.amount}
          </span>
          {price.suffix && (
            <span className="text-ink-secondary text-sm">{price.suffix}</span>
          )}
        </div>

        {pkg.guarantee && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
            <span>{pkg.guarantee}</span>
          </div>
        )}

        {!compact && (
          <ul className="mt-6 flex flex-col gap-2.5">
            {pkg.deliverables.slice(0, 4).map((d) => (
              <li key={d} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/15 border border-accent-primary/40 text-accent-primary">
                  <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-7">
          <Link
            href={`/pricing/${pkg.slug}`}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-accent-secondary hover:text-accent-cyan-soft transition-colors"
          >
            {pkg.cta}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>
      </article>
    </GradientBorder>
  );
}
