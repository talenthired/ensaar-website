import type { Metadata } from 'next';
import Image from 'next/image';
import { Container } from '@/components/ui/Container';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Enterprise AI Enablement, Software Development, and Capability Building',
  description:
    'Explore Ensaar enterprise AI enablement, software development, AI-ready engineering teams, BCEP AI readiness certification, and industry readiness programs.',
  path: '/services',
});

export default function ServicesPage() {
  const url = `${siteConfig.url}/services`;
  return (
    <>
      <JsonLd data={[
        webPageSchema({ name: 'Ensaar Services', description: metadata.description as string, url }),
        ...SERVICES.map((service) => serviceSchema({
          name: service.name,
          description: service.shortDescription,
          serviceType: service.serviceType,
          url: `${url}/${service.slug}`,
        })),
      ]} />
      <div className="relative isolate overflow-hidden bg-[#0c2343] pb-20 pt-32 text-white md:pb-24 md:pt-40">
        <Image
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=2000&q=88&auto=format&fit=crop"
          alt="Technology team planning an enterprise AI and software initiative"
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,24,51,0.98),rgba(5,24,51,0.84)_60%,rgba(5,24,51,0.5))]" />
        <Container>
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.1em] text-cyan-200">Home / What We Do</div>
            <span className="mt-8 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#f5a623]">Technology and Capability</span>
            <h1 className="mt-6 text-[clamp(2.7rem,6vw,5.2rem)] leading-[0.99] text-balance">
              Build the systems. Enable the people who use them.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-200 md:text-xl">
              Ensaar brings enterprise AI enablement, application engineering, cloud support, AI-ready
              teams, and BCEP AI readiness capability building together under one accountable relationship.
            </p>
          </div>
        </Container>
      </div>
      <ServicesSection variant="full" />
      <ContactSection />
    </>
  );
}
