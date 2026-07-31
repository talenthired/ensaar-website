import type { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';
import { listPublishedEvents } from '@/lib/events/store';
import type { EventType } from '@/lib/events/types';
import { Calendar, MapPin, Users, Mic } from 'lucide-react';
import { BcepEventGallery } from '@/components/sections/BcepEventGallery';

// Events are managed in Basecamp. Mutations call revalidatePath('/events'); this bound
// keeps the page fresh even if a revalidation is missed, and rolls events into the past
// group as dates pass without needing an edit.
export const revalidate = 900;

export const metadata: Metadata = pageMetadata({
  title: 'Events - Workshops, Webinars, Meetups',
  description:
    'Explore Ensaar BCEP AI readiness workshops, academic programs, industry meetups, startup Centre of Excellence initiatives, and certified courses.',
  path: '/events',
  eyebrow: 'Events and programs',
});

const TYPE_META: Record<EventType, { Icon: typeof Calendar; label: string }> = {
  webinar: { Icon: Mic, label: 'Webinar' },
  workshop: { Icon: Users, label: 'Workshop' },
  meetup: { Icon: Calendar, label: 'Meetup' },
  conference: { Icon: Mic, label: 'Conference' },
};

export default async function EventsPage() {
  const { upcoming, past } = await listPublishedEvents();
  const url = `${siteConfig.url}/events`;

  const trail = [
    { name: 'Home', url: siteConfig.url },
    { name: 'Events', url },
  ];

  // Physical events need a full PostalAddress, not just a place name, or the entry is
  // dropped from event rich results. `location` holds "City, Region" for in-person events.
  const eventSchemas = upcoming.map((e) => {
    const online = e.location === 'Online';
    const [locality, region] = e.location.split(',').map((part) => part.trim());
    return {
      '@context': 'https://schema.org',
      '@type': 'Event',
      '@id': `${url}#${e.id}`,
      name: e.title,
      description: e.summary,
      url: e.href ?? url,
      startDate: e.date,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: online
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
      location: online
        ? { '@type': 'VirtualLocation', url }
        : {
            '@type': 'Place',
            name: e.location,
            address: {
              '@type': 'PostalAddress',
              addressLocality: locality,
              ...(region ? { addressRegion: region } : {}),
              addressCountry: siteConfig.countryCode,
            },
          },
      ...(e.speakers && e.speakers.length > 0
        ? { performer: e.speakers.map((name) => ({ '@type': 'Organization', name })) }
        : {}),
      organizer: { '@id': `${siteConfig.url}/#organization` },
      inLanguage: 'en',
    };
  });

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Events',
            description: 'Upcoming Ensaar workshops, webinars, meetups, and conference appearances.',
            url,
            type: 'CollectionPage',
            breadcrumb: trail,
          }),
          breadcrumbSchema(trail, url),
          ...eventSchemas,
        ]}
      />

      <div className="relative isolate overflow-hidden bg-[#0c2343] pb-20 pt-32 text-white md:pb-24 md:pt-40">
        <Image
          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=2000&q=88&auto=format&fit=crop"
          alt="Audience at a professional technology conference"
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,24,51,0.98),rgba(5,24,51,0.84)_60%,rgba(5,24,51,0.46))]" />
        <Container>
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.1em] text-cyan-200">Home / Events</div>
            <span className="mt-8 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#f5a623]">Events and Programs</span>
            <h1 className="mt-6 text-[clamp(2.7rem,6vw,5.2rem)] leading-[0.99] text-balance">
              Where enterprise AI and human capability meet.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-200 md:text-xl">
              Join practical sessions on AI adoption, software engineering, leadership, emotional
              intelligence, industry readiness, and the changing nature of work.
            </p>
            <div className="mt-8">
              <Button href="/contact" withArrow className="bg-[#f5a623] text-[#0c2343] hover:bg-[#f7b83e]">Host or Attend</Button>
            </div>
          </div>
        </Container>
      </div>

      <BcepEventGallery />

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
                  className="border border-line-subtle bg-bg-secondary p-7 transition-all hover:border-line-glow hover:shadow-card"
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
                      className="border border-line-subtle bg-bg-secondary p-7 opacity-90"
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
