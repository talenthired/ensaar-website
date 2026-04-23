import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AboutSection } from '@/components/sections/AboutSection';
import { Button } from '@/components/ui/Button';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'About Ensaar Global',
  description:
    'Ensaar Global is an engineering design and technology services company founded in 2014, based in Hyderabad, India. Learn about our history, our AI-first pivot, and our approach to delivering intelligent solutions.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'About Ensaar Global',
          description:
            'Ensaar Global is an engineering design and technology services company founded in 2014, based in Hyderabad, India.',
          url: `${siteConfig.url}/about`,
        })}
      />

      <div className="pt-32 pb-12">
        <Container>
          <Breadcrumbs items={[{ name: 'About', href: '/about' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">Our Story</span>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance">
              Two decades of building. <span className="gradient-text">One AI-first future.</span>
            </h1>
            <p className="text-xl text-ink-secondary">
              Ensaar Global was founded in 2014 as an engineering design and technology services company, backed by two decades of prior experience in IT and consumer product design. Today we are actively advancing into AI — not as a marketing pivot, but as a deliberate expansion of what we can build for our clients.
            </p>
          </div>
        </Container>
      </div>

      <AboutSection />

      <section className="py-20">
        <Container>
          <div className="max-w-3xl mx-auto glass-strong rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl mb-4">Our approach</h2>
            <div className="text-ink-secondary text-lg space-y-4 text-left">
              <p>
                <strong className="text-ink-primary">We start with outcomes, not technology.</strong> Every engagement begins with a clear business problem — not a pre-selected toolchain.
              </p>
              <p>
                <strong className="text-ink-primary">We build durable capability.</strong> Our AI work leaves clients with internal expertise, documentation, and ownership — not vendor lock-in.
              </p>
              <p>
                <strong className="text-ink-primary">We respect confidentiality.</strong> Our client names are not listed publicly. Engagement references available on request.
              </p>
            </div>
            <div className="mt-8">
              <Button href="/contact" size="lg" withArrow>
                Start a conversation
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
