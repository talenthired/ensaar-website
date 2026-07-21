import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqPageSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { FAQ } from '@/lib/content/faq';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers about Ensaar Global, AI solutions, software development, managed engineering, BCEP AI readiness certification, and how to start an engagement.',
  path: '/faq',
});

const CATEGORIES: Array<{ key: typeof FAQ[number]['category']; label: string }> = [
  { key: 'company', label: 'About Ensaar' },
  { key: 'services', label: 'Services' },
  { key: 'ai', label: 'AI Capabilities' },
  { key: 'bcep', label: 'BCEP AI Readiness' },
  { key: 'engagement', label: 'Engagement' },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'FAQ',
            description: 'Frequently asked questions about Ensaar Global.',
            url: `${siteConfig.url}/faq`,
          }),
          faqPageSchema(
            FAQ.map((item) => ({ question: item.question, answer: item.answer })),
          ),
        ]}
      />

      <div className="pt-32 pb-8">
        <Container>
          <Breadcrumbs items={[{ name: 'FAQ', href: '/faq' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">FAQ</span>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance">
              Questions, <span className="gradient-text">direct answers.</span>
            </h1>
            <p className="text-xl text-ink-secondary">
              Structured answers to the questions we hear most often. If you don't find what you're looking for, write to us directly.
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <div className="max-w-4xl mx-auto">
            {CATEGORIES.map((cat) => {
              const items = FAQ.filter((f) => f.category === cat.key);
              if (items.length === 0) return null;
              return (
                <div key={cat.key} className="mb-16 last:mb-0">
                  <h2 className="text-2xl md:text-3xl mb-8">{cat.label}</h2>
                  <div className="flex flex-col gap-4">
                    {items.map((item, i) => (
                      <details
                        key={item.question}
                        className="group border border-line-subtle bg-bg-secondary p-6 transition-colors open:border-line-glow"
                        open={cat.key === 'company' && i === 0}
                      >
                        <summary className="flex items-center justify-between gap-4 cursor-pointer list-none">
                          <h3 className="text-lg md:text-xl font-display font-bold text-ink-primary flex-1">
                            {item.question}
                          </h3>
                          <span className="text-accent-primary transition-transform group-open:rotate-45 text-2xl leading-none shrink-0" aria-hidden>
                            +
                          </span>
                        </summary>
                        <p className="mt-4 text-ink-secondary leading-relaxed">{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="mt-16 border-y border-line-glow bg-bg-secondary p-10 text-center">
              <h3 className="text-2xl mb-3">Still have a question?</h3>
              <p className="text-ink-secondary mb-6">
                We're happy to talk it through. Write to us at{' '}
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="text-accent-secondary underline underline-offset-2 hover:text-accent-cyan-soft"
                >
                  {siteConfig.email}
                </a>
                .
              </p>
              <Button href="/contact" size="lg" withArrow>
                Contact us
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
