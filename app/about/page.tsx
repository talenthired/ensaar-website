import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AboutSection } from '@/components/sections/AboutSection';
import { Button } from '@/components/ui/Button';
import { HeroImage } from '@/components/ui/HeroImage';
import { GlowOrbs } from '@/components/illustrations/Decorations';
import { DotPattern } from '@/components/ui/DotPattern';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const url = `${siteConfig.url}/about`;
const trail = [
  { name: 'Home', url: siteConfig.url },
  { name: 'About', url },
];

export const metadata: Metadata = pageMetadata({
  title: 'About Ensaar Global',
  description:
    'Ensaar Global is an enterprise AI enablement and software engineering company founded in 2014, with locations in Hyderabad and Noida.',
  path: '/about',
  eyebrow: 'Our story',
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'About Ensaar Global',
            description:
              'Ensaar Global helps students, engineers, and organizations adopt enterprise-grade AI from Hyderabad and Noida.',
            url,
            type: 'AboutPage',
            breadcrumb: trail,
          }),
          breadcrumbSchema(trail, url),
        ]}
      />

      <div className="relative pt-32 pb-16 overflow-hidden">
        <GlowOrbs className="absolute inset-0 -z-10 opacity-60" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 -z-10 opacity-[0.07] text-accent-primary">
          <DotPattern />
        </div>
        <Container>
          <Breadcrumbs items={[{ name: 'About', href: '/about' }]} />
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] items-center">
            <div>
              <span className="eyebrow mb-6">Our Story</span>
              <h1 className="text-[clamp(2.25rem,5.5vw,4.25rem)] mt-6 mb-6 text-balance leading-[1.05]">
                Two decades of building. <span className="gradient-text">One AI-first future.</span>
              </h1>
              <p className="text-lg md:text-xl text-ink-secondary">
                Ensaar Global was founded in 2014 as an engineering design and technology services company. Today, from Hyderabad and Noida, we help students, engineers, and organizations adopt enterprise-grade AI with practical support across technology and human capability.
              </p>
            </div>
            <HeroImage
              src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1400&q=80&auto=format&fit=crop"
              alt="Modern collaborative workspace"
              tint="brand"
            />
          </div>
        </Container>
      </div>

      <AboutSection />

      <section className="py-20">
        <Container>
          <div className="mx-auto max-w-3xl border-y border-line-glow bg-bg-secondary p-8 text-center md:p-12">
            <h2 className="text-3xl md:text-4xl mb-4">Our approach</h2>
            <div className="text-ink-secondary text-lg space-y-4 text-left">
              <p>
                <strong className="text-ink-primary">We start with people and outcomes.</strong> Every engagement begins with the audience, the work, and the controls that matter, not a pre-selected toolchain.
              </p>
              <p>
                <strong className="text-ink-primary">We build durable capability.</strong> Our AI work leaves clients with internal expertise, documentation, and ownership, not vendor lock-in.
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
