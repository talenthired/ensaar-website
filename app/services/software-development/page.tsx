import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { AICaseStudiesSection } from '@/components/sections/AICaseStudiesSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { siteConfig } from '@/lib/utils';

const service = SERVICES.find((item) => item.slug === 'software-development')!;

export const metadata: Metadata = pageMetadata({
  title: 'Custom Software Development and Product Engineering',
  description: service.shortDescription,
  path: '/services/software-development',
});

export default function SoftwareDevelopmentPage() {
  const url = `${siteConfig.url}/services/${service.slug}`;
  return (
    <>
      <JsonLd data={[
        webPageSchema({ name: service.name, description: service.shortDescription, url }),
        serviceSchema({ name: service.name, description: service.longDescription, serviceType: service.serviceType, url }),
      ]} />
      <ServiceDetailPage service={service} />
      <AICaseStudiesSection limit={4} />
      <ContactSection />
    </>
  );
}
