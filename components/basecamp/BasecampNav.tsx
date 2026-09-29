'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, CalendarDays, ClipboardList, ContactRound, ExternalLink, LayoutDashboard, LogOut, UserCog, Users } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { href: '/basecamp', label: 'Overview', icon: LayoutDashboard },
  { href: '/basecamp/leads', label: 'Submissions', icon: Users },
  { href: '/basecamp/clients', label: 'Clients', icon: Briefcase },
  { href: '/basecamp/employees', label: 'Employees', icon: ContactRound },
  { href: '/basecamp/events', label: 'Events', icon: CalendarDays },
  { href: '/basecamp/registrations', label: 'Registrations', icon: ClipboardList },
  { href: '/basecamp/people', label: 'People', icon: UserCog },
] as const;

function Brand() {
  return (
    <Link href="/basecamp" className="flex shrink-0 items-center gap-3" aria-label="Basecamp overview">
      <Image src="/ensaar-logo.png" alt="Ensaar Global" width={938} height={259} priority className="h-7 w-auto" />
      <span className="border-l border-line-subtle pl-3 text-sm font-semibold text-ink-primary">Basecamp</span>
    </Link>
  );
}

function WebsiteLink() {
  // A new tab, so leaving to check the public site never loses work in Basecamp.
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-ink-secondary transition hover:bg-bg-tertiary hover:text-ink-primary sm:px-3"
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      {/* Icon only until the bar has room for the words beside seven sections. */}
      <span className="sr-only 2xl:not-sr-only">Go to website</span>
    </a>
  );
}

/**
 * The bar for Basecamp pages a visitor sees before signing in (login, accepting
 * an invitation). The website's own header is not rendered anywhere under
 * /basecamp; see app/layout.tsx.
 */
export function BasecampBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle border-t-[3px] border-t-accent-primary bg-bg-primary/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand />
        <div className="flex items-center gap-1">
          <WebsiteLink />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** The signed-in admin bar: sections, a way back to the website, sign out. */
export function BasecampNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch('/api/basecamp/session', { method: 'DELETE' });
    router.push('/basecamp/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle border-t-[3px] border-t-accent-primary bg-bg-primary/95 backdrop-blur print:hidden">
      <div className="container-page flex flex-col gap-2 py-2 xl:h-16 xl:flex-row xl:items-center xl:gap-4 xl:py-0">
        <div className="flex items-center justify-between gap-4 xl:contents">
          <Brand />
          <div className="flex items-center gap-1 xl:order-last xl:ml-auto">
            <WebsiteLink />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-ink-secondary transition hover:bg-bg-tertiary hover:text-ink-primary sm:px-3"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="sr-only 2xl:not-sr-only">Sign out</span>
            </button>
          </div>
        </div>
        <nav aria-label="Basecamp sections" className="-mx-1 flex min-w-0 gap-0.5 overflow-x-auto px-1 pb-1 xl:flex-1 xl:pb-0">
          {SECTIONS.map((section) => {
            // Only /basecamp itself matches exactly; the rest match their subtree.
            const active = section.href === '/basecamp' ? pathname === section.href : pathname.startsWith(section.href);
            return (
              <Link
                key={section.href}
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition',
                  active ? 'bg-ink-primary text-bg-primary' : 'text-ink-secondary hover:bg-bg-tertiary hover:text-ink-primary',
                )}
              >
                <section.icon className="h-4 w-4" aria-hidden />
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
