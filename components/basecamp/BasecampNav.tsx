'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/basecamp', label: 'Overview', icon: LayoutDashboard },
  { href: '/basecamp/leads', label: 'Submissions', icon: Users },
  { href: '/basecamp/events', label: 'Events', icon: CalendarDays },
] as const;

export function BasecampNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch('/api/basecamp/session', { method: 'DELETE' });
    router.push('/basecamp/login');
    router.refresh();
  }

  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line-subtle pb-5 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Basecamp sections" className="flex gap-1 overflow-x-auto">
        {SECTIONS.map((section) => {
          // Only /basecamp itself matches exactly; the rest match their subtree.
          const active =
            section.href === '/basecamp' ? pathname === section.href : pathname.startsWith(section.href);
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition',
                active
                  ? 'bg-ink-primary text-bg-primary'
                  : 'text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary',
              )}
            >
              <section.icon className="h-4 w-4" aria-hidden />
              {section.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-secondary transition hover:bg-bg-tertiary hover:text-ink-primary"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Sign out
      </button>
    </div>
  );
}
