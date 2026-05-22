import Image from 'next/image';
import { cn } from '@/lib/utils';

type HeroImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Optional tint overlay (gradient blend in brand color). */
  tint?: 'brand' | 'warm' | 'fresh' | 'none';
};

const TINTS: Record<NonNullable<HeroImageProps['tint']>, string> = {
  brand:
    'bg-gradient-to-tr from-accent-primary/20 via-transparent to-accent-cyan/15 mix-blend-multiply',
  warm:
    'bg-gradient-to-tr from-orange-500/15 via-transparent to-pink-500/15 mix-blend-multiply',
  fresh:
    'bg-gradient-to-tr from-emerald-500/15 via-transparent to-cyan-500/15 mix-blend-multiply',
  none: 'hidden',
};

/**
 * Hero image with consistent treatment:
 * - Rounded corners + subtle border
 * - Optional brand-tinted overlay for cohesion
 * - Sized 4:3 by default; adjust via className
 */
export function HeroImage({ src, alt, className, tint = 'brand' }: HeroImageProps) {
  return (
    <div
      className={cn(
        'relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-line-subtle shadow-card',
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
        className="object-cover"
      />
      <div aria-hidden className={cn('absolute inset-0 pointer-events-none', TINTS[tint])} />
      {/* subtle bottom fade for visual depth */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg-primary/30 to-transparent pointer-events-none"
      />
    </div>
  );
}
