import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { GlowOrbs } from '@/components/illustrations/Decorations';
import { DotPattern } from '@/components/ui/DotPattern';
import { HeroImage } from '@/components/ui/HeroImage';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';
import { upcomingEvents, pastEvents, type EnsaarEvent } from '@/lib/content/events';
import { Calendar, MapPin, Users, Mic } from 'lucide-react';

export const metadata: Metadata = pageMetadata({
  title: 'Events - Workshops, Webinars, Meetups',
  description:
    'Upcoming Ensaar events: AI meetups, BCEP workshops, webinars on AI staffing, and conference appearances.',
  path: '/events',
});

const TYPE_META: Record<EnsaarEvent['type'], { Icon: typeof Calendar; label: string }> = {
  webinar: { Icon: Mic, label: 'Webinar' },
  workshop: { Icon: Users, label: 'Workshop' },
  meetup: { Icon: Calendar, label: 'Meetup' },
  conference: { Icon: Mic, label: 'Conference' },
};

export default function EventsPage() {
  const upcoming = upcomingEvents();
  const past = pastEvents();
  const url = `${siteConfig.url}/events`;

  // Lightweight Event JSON-LD
  const eventSchemas = upcoming.map((e) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.summary,
    startDate: e.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      e.location === 'Online'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    location:
      e.location === 'Online'
        ? { '@type': 'VirtualLocation', url: siteConfig.url }
        : { '@type': 'Place', name: e.location },
    organizer: { '@type': 'Organization', name: siteConfig.legalName, url: siteConfig.url },
  }));

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Events',
            description: 'Upcoming Ensaar workshops, webinars, meetups, and conference appearances.',
            url,
          }),
          ...eventSchemas,
        ]}
      />

      <div className="relative pt-32 pb-16 overflow-hidden">
        <GlowOrbs palette="warm" className="absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 -z-10 opacity-[0.07] text-accent-primary">
          <DotPattern />
        </div>
        <Container>
          <Breadcrumbs items={[{ name: 'Events', href: '/events' }]} />
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
            <div>
              <span className="eyebrow mb-6">Events</span>
              <h1 className="text-[clamp(2.25rem,5.5vw,4.25rem)] mt-6 mb-6 text-balance leading-[1.05]">
                Where we'll be <span className="gradient-text">talking, teaching, learning.</span>
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary mb-10">
                We host meetups, run BCEP workshops, and speak at conferences. If you'd like to attend, organize, or invite us to one - get in touch.
              </p>
              <Button href="/contact" withArrow>Invite Ensaar</Button>
            </div>
            <HeroImage
              src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80&auto=format&fit=crop"
              alt="Audience at a professional conference"
              tint="warm"
            />
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <h2 className="text-2xl md:text-3xl mb-8">Upcoming</h2>
          <div className="grid gap-5 md:grid-cols-2 mb-16">
            {upcoming.map((e) => {
              const meta = TYPE_META[e.type];
              const date = new Date(e.date);
              return (
                <article
                  key={e.id}
                  className="glass rounded-2xl p-7 hover:border-line-glow hover:shadow-glow transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-brand-soft border border-line-subtle text-accent-primary">
                      <meta.Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent-secondary">
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl mb-3 text-ink-primary">{e.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-ink-secondary mb-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" aria-hidden />
                      <time dateTime={e.date}>
                        {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </time>
                    </span>
                    <span className="text-ink-muted">|</span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {e.location}
                    </span>
                  </div>
                  <p className="text-ink-secondary text-[0.9375rem]">{e.summary}</p>
                </article>
              );
            })}
          </div>

          {past.length > 0 && (
            <>
              <h2 className="text-2xl md:text-3xl mb-8">Recent</h2>
              <div className="grid gap-5 md:grid-cols-2">
                {past.map((e) => {
                  const meta = TYPE_META[e.type];
                  const date = new Date(e.date);
                  return (
                    <article
                      key={e.id}
                      className="rounded-2xl p-7 border border-line-subtle bg-bg-secondary opacity-90"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <meta.Icon className="h-4 w-4 text-ink-muted" aria-hidden />
                        <span className="font-mono text-xs uppercase tracking-[0.15em] text-ink-muted">
                          {meta.label} | Past
                        </span>
                      </div>
                      <h3 className="text-base md:text-lg mb-2 text-ink-primary">{e.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-ink-muted mb-2">
                        <time dateTime={e.date}>
                          {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                        <span>|</span>
                        <span>{e.location}</span>
                      </div>
                      <p className="text-ink-secondary text-sm">{e.summary}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
