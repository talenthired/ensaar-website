import { ShieldCheck } from 'lucide-react';
import { siteConfig, cn } from '@/lib/utils';

/**
 * Compact refund/guarantee chip used on program cards and pricing detail pages.
 * Links to the full refund policy. Always renders inside surfaces that quote a price.
 */
export function GuaranteeBadge({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <a
      href={siteConfig.refundUrl}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-1 text-xs text-ink-secondary transition-colors hover:border-emerald-500/50 hover:text-ink-primary',
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
      <span>{text}</span>
    </a>
  );
}
