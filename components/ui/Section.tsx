import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

type SectionProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'article';
};

export function Section({ as: Tag = 'section', className, ...props }: SectionProps) {
  return (
    <Tag className={cn('section-padding relative', className)} {...props} />
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: 'center' | 'left';
  className?: string;
};

export function SectionHeader({ eyebrow, title, lede, align = 'center', className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-12 md:mb-20 max-w-[760px]',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && <span className="eyebrow mb-5">{eyebrow}</span>}
      <h2 className="text-[clamp(2rem,5vw,3.5rem)] mt-5 mb-5 text-balance">{title}</h2>
      {lede && (
        <p className="text-[clamp(1rem,1.4vw,1.125rem)] text-ink-secondary max-w-[640px] mx-auto">
          {lede}
        </p>
      )}
    </div>
  );
}
