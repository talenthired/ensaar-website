import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig, SITE_LAST_MODIFIED } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Notice',
  description:
    'What Ensaar Global stores in your browser, why, and how to remove it. Analytics, theme preference, attribution, and the support conversation.',
  path: '/legal/cookies',
});

/**
 * Written from the code rather than from a template: every item below is a key
 * that actually exists in this application. A cookie notice listing categories
 * the site does not use is worse than none, because nobody can check it.
 */
export default function CookiesPage() {
  const url = `${siteConfig.url}/legal/cookies`;
  const trail = [
    { name: 'Home', url: siteConfig.url },
    { name: 'Cookie Notice', url },
  ];

  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: 'Cookie Notice', description: 'What Ensaar Global stores in your browser and why.', url, breadcrumb: trail }),
          breadcrumbSchema(trail, url),
        ]}
      />

      <div className="relative pt-32 pb-12">
        <Container>
          <Breadcrumbs items={[{ name: 'Cookie Notice', href: '/legal/cookies' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-6">Legal</span>
            <h1 className="text-[clamp(2rem,4.5vw,3.5rem)] mt-6 mb-6 text-balance leading-[1.05]">
              Cookie notice
            </h1>
            <p className="text-lg text-ink-secondary">
              This site keeps very little in your browser. Nothing here identifies you by name, and we
              do not run advertising or cross-site tracking cookies. Last reviewed {SITE_LAST_MODIFIED}.
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <article className="max-w-3xl space-y-10 text-[1rem] leading-relaxed text-ink-secondary">
            <Policy title="What we store, and why">
              <ul className="mt-4 flex flex-col gap-4">
                <Item name="ensaar-theme" kind="Local storage, kept until you clear it">
                  Remembers whether you chose the light or dark theme, so the site does not flip back
                  on your next visit.
                </Item>
                <Item name="ensaar-attribution" kind="Session storage, cleared when you close the tab">
                  Records the first page you landed on, the referring site, and any campaign
                  parameters in the URL. If you later submit an enquiry, this tells us which channel
                  introduced you.
                </Item>
                <Item name="ensaar-advisor-nudge-dismissed" kind="Session storage, cleared when you close the tab">
                  Remembers that you dismissed the assistant prompt, so it does not reappear on every
                  page in the same visit.
                </Item>
                <Item name="ensaar-support-conversation" kind="Local storage, kept until you clear it">
                  Holds the identifier and token for a live support conversation you started, so the
                  thread is still there when you come back. Only set if you start a chat.
                </Item>
                <Item name="ensaar_basecamp" kind="Cookie, signed, for staff only">
                  The session for Ensaar's internal admin area. It is only set when a member of our
                  team signs in, and it is never set for a visitor.
                </Item>
                <Item name="_ga and _ga_*" kind="Cookies set by Google Analytics">
                  Measure which pages are read and which routes people take through the site, in
                  aggregate. These are only present when analytics is enabled for the deployment.
                </Item>
              </ul>
            </Policy>

            <Policy title="What we do not do">
              We do not use advertising cookies, we do not build cross-site profiles, we do not sell
              anything a browser stores here, and we do not embed third-party trackers beyond the
              analytics described above.
            </Policy>

            <Policy title="Removing them">
              Clearing site data for this domain in your browser removes everything listed above.
              Blocking cookies entirely will still leave the site usable: the theme resets to light,
              the assistant prompt reappears, and a live chat thread cannot be restored.
            </Policy>

            <Policy title="Questions">
              Write to{' '}
              <a href={`mailto:${siteConfig.email}`} className="underline">{siteConfig.email}</a>. Our{' '}
              <a href="/legal/privacy" className="underline">privacy notice</a> covers what happens to
              information you send us through a form.
            </Policy>
          </article>
        </Container>
      </Section>
    </>
  );
}

function Policy({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl text-ink-primary md:text-2xl">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function Item({ name, kind, children }: { name: string; kind: string; children: ReactNode }) {
  return (
    <li className="border-l-2 border-accent-cyan pl-4">
      <div className="font-mono text-sm text-ink-primary">{name}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.08em] text-ink-muted">{kind}</div>
      <p className="mt-2">{children}</p>
    </li>
  );
}
