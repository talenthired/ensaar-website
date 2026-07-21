import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { siteConfig } from '@/lib/utils';

const service = SERVICES.find((item) => item.slug === 'ai-solutions')!;

export const metadata: Metadata = pageMetadata({
  title: 'Enterprise AI Workflow Diagnostics, Pilots, and Implementation',
  description: service.shortDescription,
  path: '/services/ai-solutions',
});

export default function AISolutionsPage() {
  const url = `${siteConfig.url}/services/${service.slug}`;
  return <><JsonLd data={[
    webPageSchema({ name: service.name, description: service.shortDescription, url }),
    serviceSchema({ name: service.name, description: service.longDescription, serviceType: service.serviceType, url }),
  ]} /><ServiceDetailPage service={service} /></>;
}
