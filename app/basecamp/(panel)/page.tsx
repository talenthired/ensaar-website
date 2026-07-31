import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CircleAlert, Inbox, TriangleAlert } from 'lucide-react';
import { listLeads } from '@/lib/leads/store';
import { listEvents } from '@/lib/events/store';
import { isUpcoming } from '@/lib/events/types';

export const metadata: Metadata = {
  title: 'Overview - Basecamp',
  robots: { index: false, follow: false },
};

// Always reflects the live stores; a cached admin dashboard is worse than no dashboard.
export const dynamic = 'force-dynamic';

/** Either store can fail on a misconfigured deployment. Surface that instead of a 500. */
async function safely<T>(load: () => Promise<T>, fallback: T): Promise<[T, string]> {
  try {
    return [await load(), ''];
  } catch (error) {
    console.error('Basecamp overview load failed', error);
    return [fallback, error instanceof Error ? error.message : 'Unable to load.'];
  }
}

export default async function BasecampOverviewPage() {
  const [[leads, leadsError], [events, eventsError]] = await Promise.all([
    safely(listLeads, []),
    safely(listEvents, []),
  ]);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const newLeads = leads.filter((lead) => lead.status === 'new');
  const leadsThisWeek = leads.filter((lead) => new Date(lead.createdAt) >= weekStart).length;
  const overdue = leads.filter(
    (lead) =>
      !['won', 'lost'].includes(lead.status) &&
      lead.nextActionAt &&
      new Date(lead.nextActionAt) <= new Date(),
  ).length;

  const upcomingEvents = events.filter((event) => isUpcoming(event));
  const liveUpcoming = upcomingEvents.filter((event) => event.published);
  const drafts = events.filter((event) => !event.published);

  return (
    <section>
      <div className="border-b border-line-subtle pb-7">
        <span className="eyebrow">Basecamp</span>
        <h1 className="mt-4 text-3xl md:text-4xl">Website administration</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Contact submissions and the public events calendar for ensaar.com.
        </p>
      </div>

      {(leadsError || eventsError) && (
        <p className="mt-6 flex items-start gap-3 rounded-lg bg-rose-500/10 p-4 text-sm text-rose-600">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {leadsError && <span className="block">Submissions: {leadsError}</span>}
            {eventsError && <span className="block">Events: {eventsError}</span>}
            <span className="mt-1 block text-xs opacity-80">
              Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
            </span>
          </span>
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New submissions" value={newLeads.length} alert={newLeads.length > 0} />
        <Stat label="Submissions this week" value={leadsThisWeek} />
        <Stat label="Actions overdue" value={overdue} alert={overdue > 0} />
        <Stat label="Upcoming events live" value={liveUpcoming.length} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Latest submissions"
          href="/basecamp/leads"
          cta="Open pipeline"
          icon={Inbox}
          empty="No contact submissions yet."
          isEmpty={leads.length === 0}
        >
          {leads.slice(0, 5).map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-primary">{lead.name}</span>
                <span className="block truncate text-xs text-ink-muted">
                  {lead.company || lead.email} - {lead.workType}
                </span>
              </span>
              <span className="shrink-0 text-xs text-ink-muted">{relativeDate(lead.createdAt)}</span>
            </li>
          ))}
        </Panel>

        <Panel
          title="Next events"
          href="/basecamp/events"
          cta="Manage events"
          icon={CalendarDays}
          empty="No upcoming events scheduled."
          isEmpty={upcomingEvents.length === 0}
        >
          {[...upcomingEvents]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 5)
            .map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-primary">{event.title}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    <time dateTime={event.date}>{formatDate(event.date)}</time> - {event.location}
                  </span>
                </span>
                {!event.published && (
                  <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Draft
                  </span>
                )}
              </li>
            ))}
        </Panel>
      </div>

      {drafts.length > 0 && (
        <p className="mt-6 flex items-center gap-2 text-sm text-ink-secondary">
          <CircleAlert className="h-4 w-4 text-amber-500" aria-hidden />
          {drafts.length} unpublished {drafts.length === 1 ? 'event is' : 'events are'} not visible on
          the public site.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-line-subtle bg-bg-primary p-5">
      <div className="text-xs text-ink-muted">{label}</div>
      <div
        className={
          alert ? 'mt-2 font-display text-3xl text-rose-500' : 'mt-2 font-display text-3xl text-ink-primary'
        }
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  href,
  cta,
  icon: Icon,
  children,
  empty,
  isEmpty,
}: {
  title: string;
  href: string;
  cta: string;
  icon: typeof Inbox;
  children: React.ReactNode;
  empty: string;
  isEmpty: boolean;
}) {
  return (
    <div className="rounded-xl border border-line-subtle bg-bg-primary p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-primary" aria-hidden />
        <h2 className="text-lg">{title}</h2>
      </div>
      {isEmpty ? (
        <p className="mt-5 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line-subtle">{children}</ul>
      )}
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-primary hover:underline"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function relativeDate(value: string) {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
