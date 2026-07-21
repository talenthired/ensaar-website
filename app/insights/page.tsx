import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { INSIGHTS } from '@/lib/content/insights';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Enterprise AI Adoption and Engineering Insights',
  description:
    'Practical guides to enterprise AI adoption, multi-model strategy, IDE-native engineering, RAG, governance, observability, and secure deployment.',
  path: '/insights',
});

export default function InsightsPage() {
  const url = `${siteConfig.url}/insights`;
  return (
    <>
      <JsonLd data={webPageSchema({ name: 'Enterprise AI Adoption and Engineering Insights', description: metadata.description as string, url })} />
      <div className="pt-32 pb-12">
        <Container>
          <Breadcrumbs items={[{ name: 'Insights', href: '/insights' }]} />
          <div className="max-w-4xl">
            <span className="eyebrow">AI Adoption Guides</span>
            <h1 className="mt-6 text-[clamp(2.4rem,5.5vw,4.75rem)] leading-[1.03] text-balance">
              Move from AI interest to <span className="gradient-text">operating capability.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-secondary">
              Practical frameworks for leaders and engineers choosing models, workflows,
              infrastructure, controls, and adoption paths. Written for decisions, not trend commentary.
            </p>
          </div>
        </Container>
      </div>

      <section className="pb-24">
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            {INSIGHTS.map((insight) => (
              <article key={insight.slug} className="group overflow-hidden rounded-lg border border-line-subtle bg-bg-secondary transition hover:-translate-y-1 hover:shadow-card">
                <Link href={`/insights/${insight.slug}`} className="block">
                  <div className="relative aspect-[16/8] overflow-hidden">
                    <Image src={insight.image} alt={insight.imageAlt} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" aria-hidden />
                  </div>
                  <div className="p-6 md:p-7">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                      <span className="font-mono uppercase tracking-[0.12em] text-accent-secondary">{insight.category}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden />{insight.readingTime}</span>
                    </div>
                    <h2 className="mt-4 text-2xl leading-tight">{insight.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{insight.description}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-primary">
                      Read guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
