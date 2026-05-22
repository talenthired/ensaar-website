import { cn } from '@/lib/utils';

/**
 * Subtle dot grid background - Scadea-style "pattern-1" feel.
 * Use as an absolutely-positioned decoration with low opacity.
 */
export function DotPattern({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-full h-full', className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="dotgrid" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotgrid)" />
    </svg>
  );
}
