import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { BcepOverviewSection } from '@/components/sections/BcepOverviewSection';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { siteConfig } from '@/lib/utils';

const service = SERVICES.find((item) => item.slug === 'corporate-training')!;

export const metadata: Metadata = pageMetadata({
  title: 'Get BCEP Certified | AI Readiness and Business Communication Excellence',
  description: service.shortDescription,
  path: '/services/corporate-training',
});

export default function CorporateTrainingPage() {
  const url = `${siteConfig.url}/services/${service.slug}`;
  return <><JsonLd data={[
    webPageSchema({ name: service.name, description: service.shortDescription, url }),
    serviceSchema({ name: service.name, description: service.longDescription, serviceType: service.serviceType, url }),
  ]} /><ServiceDetailPage service={service} /><BcepOverviewSection /></>;
}
