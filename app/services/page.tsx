import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Services — AI, Engineering Design, Technology',
  description:
    'Ensaar Global delivers three core services: AI Solutions, Engineering Design, and Technology Services — plus a dedicated training practice (BCEP). Modern AI capability combined with two decades of engineering experience.',
  path: '/services',
});

export default function ServicesPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'Services',
          description:
            'Ensaar Global delivers AI Solutions, Engineering Design, and Technology Services — plus BCEP corporate training.',
          url: `${siteConfig.url}/services`,
        })}
      />
      <div className="pt-32 pb-8">
        <Container>
          <Breadcrumbs items={[{ name: 'Services', href: '/services' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">Services</span>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance">
              Services that <span className="gradient-text">move the business forward.</span>
            </h1>
            <p className="text-xl text-ink-secondary">
              Three core capabilities — AI Solutions, Engineering Design, Technology Services — unified by a single principle: technology that solves real problems elegantly. Plus our dedicated Business Excellence Program for training and capability building.
            </p>
          </div>
        </Container>
      </div>
      <ServicesSection />
    </>
  );
}
