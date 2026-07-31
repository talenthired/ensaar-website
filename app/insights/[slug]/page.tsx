import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Clock3 } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { articleSchema, breadcrumbSchema, faqPageSchema, webPageSchema } from '@/components/seo/schemas';
import { INSIGHTS, getInsight } from '@/lib/content/insights';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return INSIGHTS.map((insight) => ({ slug: insight.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) {
    return pageMetadata({
      title: 'Insight not found',
      description: 'This insight is no longer available.',
      path: `/insights/${slug}`,
      noindex: true,
    });
  }
  return pageMetadata({
    title: insight.title,
    description: insight.description,
    path: `/insights/${slug}`,
    eyebrow: insight.category,
    article: {
      publishedTime: insight.published,
      modifiedTime: insight.updated,
      section: insight.category,
    },
  });
}

/** Approximate body length, used for Article.wordCount. */
function countWords(insight: { sections: Array<{ paragraphs: string[]; bullets?: string[] }> }) {
  return insight.sections
    .flatMap((section) => [...section.paragraphs, ...(section.bullets ?? [])])
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

export default async function InsightPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const insight = getInsight(slug);
  if (!insight) notFound();
  const url = `${siteConfig.url}/insights/${insight.slug}`;
  const trail = [
    { name: 'Home', url: siteConfig.url },
    { name: 'Insights', url: `${siteConfig.url}/insights` },
    { name: insight.title, url },
  ];

  return (
    <>
      <JsonLd data={[
        webPageSchema({
          name: insight.title,
          description: insight.description,
          url,
          datePublished: insight.published,
          dateModified: insight.updated,
          breadcrumb: trail,
        }),
        articleSchema({
          title: insight.title,
          description: insight.description,
          url,
          datePublished: insight.published,
          dateModified: insight.updated,
          imageUrl: insight.image,
          articleSection: insight.category,
          wordCount: countWords(insight),
          abstract: insight.summary,
          keywords: insight.sections.map((section) => section.heading),
        }),
        faqPageSchema(insight.faq),
        breadcrumbSchema(trail, url),
      ]} />

      <article>
        <header className="pt-32 pb-14">
          <Container>
            <Breadcrumbs items={[{ name: 'Insights', href: '/insights' }, { name: insight.title, href: `/insights/${insight.slug}` }]} />
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                  <span className="font-mono uppercase tracking-[0.12em] text-accent-secondary">{insight.category}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden />{insight.readingTime}</span>
                  <time dateTime={insight.updated}>Updated {formatDate(insight.updated)}</time>
                </div>
                <h1 className="mt-6 text-[clamp(2.3rem,5vw,4.25rem)] leading-[1.04] text-balance">{insight.title}</h1>
                <p className="mt-6 text-lg leading-relaxed text-ink-secondary">{insight.description}</p>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line-subtle shadow-card">
                <Image src={insight.image} alt={insight.imageAlt} fill priority sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
              </div>
            </div>
          </Container>
        </header>

        <div className="border-y border-line-subtle bg-bg-secondary py-10">
          <Container>
            <div className="mx-auto max-w-4xl">
              <div className="font-mono text-xs uppercase tracking-[0.14em] text-accent-secondary">Executive summary</div>
              <ul className="mt-5 grid gap-4 md:grid-cols-2">
                {insight.summary.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-ink-secondary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />{item}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </div>

        <Container>
          <div className="mx-auto grid max-w-5xl gap-12 py-16 lg:grid-cols-[220px_1fr]">
            <nav aria-label="On this page" className="h-fit lg:sticky lg:top-28">
              <div className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">On this page</div>
              <ol className="mt-4 space-y-3 text-sm text-ink-secondary">
                {insight.sections.map((section, index) => (
                  <li key={section.heading}><a className="transition hover:text-accent-primary" href={`#section-${index + 1}`}>{section.heading}</a></li>
                ))}
              </ol>
            </nav>

            <div className="min-w-0">
              {insight.sections.map((section, index) => (
                <section key={section.heading} id={`section-${index + 1}`} className="scroll-mt-28 border-b border-line-subtle pb-12 mb-12 last:border-0">
                  <h2 className="text-2xl md:text-3xl">{section.heading}</h2>
                  <div className="mt-5 space-y-5 text-[1.0625rem] leading-8 text-ink-secondary">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                  {section.bullets && (
                    <ul className="mt-6 space-y-3">
                      {section.bullets.map((item) => <li key={item} className="flex items-start gap-3 text-ink-secondary"><Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />{item}</li>)}
                    </ul>
                  )}
                </section>
              ))}

              <section className="mt-16">
                <h2 className="text-3xl">Frequently asked questions</h2>
                <div className="mt-7 divide-y divide-line-subtle border-y border-line-subtle">
                  {insight.faq.map((item) => (
                    <details key={item.question} className="group py-5">
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-ink-primary">
                        {item.question}<span className="text-accent-primary transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section className="mt-16 rounded-lg border border-line-subtle bg-bg-secondary p-8">
                <div className="font-mono text-xs uppercase tracking-[0.14em] text-accent-secondary">Put the guide to work</div>
                <h2 className="mt-4 text-3xl">Turn the next AI decision into a practical plan.</h2>
                <p className="mt-4 text-ink-secondary">We will help clarify the users, workflows, models, infrastructure, controls, and adoption support required for a responsible first step.</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button href={insight.relatedOffer.href} withArrow>{insight.relatedOffer.label}</Button>
                  <Button href="/contact" variant="outline">Start a conversation</Button>
                </div>
              </section>

              <Link href="/insights" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-accent-primary">
                Explore all insights <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </article>
    </>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
