import { AlertCircle } from 'lucide-react';
import { siteConfig, cn } from '@/lib/utils';

/**
 * Small, honest footnote linking to the full earnings disclaimer page.
 * Render anywhere we make or imply income claims: hero, calculator, pricing cards.
 * This component is non-negotiable Phase 1 surface — its presence is the
 * difference between a credible aspirational headline and an FTC target.
 */
export function EarningsDisclaimer({
  variant = 'inline',
  className,
}: {
  variant?: 'inline' | 'callout';
  className?: string;
}) {
  if (variant === 'callout') {
    return (
      <aside
        role="note"
        className={cn(
          'flex items-start gap-3 rounded-2xl border border-amber-300/30 bg-amber-50/5 px-5 py-4 text-sm text-ink-secondary',
          className,
        )}
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <p>
          <span className="font-semibold text-ink-primary">Income is not guaranteed.</span>{' '}
          Results vary based on the time you commit, what you build, and the market you ship into.{' '}
          <a href={siteConfig.disclaimerUrl} className="underline hover:text-ink-primary">
            Read the full earnings disclaimer
          </a>
          .
        </p>
      </aside>
    );
  }

  return (
    <p className={cn('text-xs text-ink-muted', className)}>
      Income is not guaranteed; results vary.{' '}
      <a
        href={siteConfig.disclaimerUrl}
        className="underline underline-offset-2 hover:text-ink-secondary"
      >
        Earnings disclaimer
      </a>
      .
    </p>
  );
}
