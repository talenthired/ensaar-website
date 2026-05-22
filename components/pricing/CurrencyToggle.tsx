'use client';

import type { Currency } from '@/lib/content/pricing';
import { cn } from '@/lib/utils';

export function CurrencyToggle({
  value,
  onChange,
  className,
}: {
  value: Currency;
  onChange: (next: Currency) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Currency"
      className={cn(
        'inline-flex items-center rounded-full border border-line-subtle bg-bg-secondary p-1 text-sm',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange('USD')}
        aria-pressed={value === 'USD'}
        className={cn(
          'rounded-full px-4 py-1.5 font-medium transition-colors',
          value === 'USD'
            ? 'bg-gradient-brand text-white shadow-[0_2px_10px_rgba(99,102,241,0.35)]'
            : 'text-ink-secondary hover:text-ink-primary',
        )}
      >
        USD
      </button>
      <button
        type="button"
        onClick={() => onChange('INR')}
        aria-pressed={value === 'INR'}
        className={cn(
          'rounded-full px-4 py-1.5 font-medium transition-colors',
          value === 'INR'
            ? 'bg-gradient-brand text-white shadow-[0_2px_10px_rgba(99,102,241,0.35)]'
            : 'text-ink-secondary hover:text-ink-primary',
        )}
      >
        INR
      </button>
    </div>
  );
}
