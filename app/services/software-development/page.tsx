import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceDetailSchemas } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { AICaseStudiesSection } from '@/components/sections/AICaseStudiesSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';

const service = SERVICES.find((item) => item.slug === 'software-development')!;

export const metadata: Metadata = pageMetadata({
  title: 'Custom Software Development and Product Engineering',
  description: service.shortDescription,
  path: '/services/software-development',
  eyebrow: 'Software engineering',
  keywords: [
    'custom software development company',
    'product engineering services',
    'enterprise application development',
    'SaaS development',
    'mobile app development India',
    'legacy application modernization',
  ],
});

export default function SoftwareDevelopmentPage() {
  return (
    <>
      <JsonLd data={serviceDetailSchemas(service)} />
      <ServiceDetailPage service={service} />
      <AICaseStudiesSection limit={4} />
      <ContactSection />
    </>
  );
}
