import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { getService } from '@/lib/content/services';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const SLUG = 'ai-solutions';
const service = getService(SLUG);

export const metadata: Metadata = pageMetadata({
  title: 'AI Solutions — Claude & LLM Integration, Agentic Workflows',
  description:
    service?.shortDescription ||
    'AI strategy, Claude integration, agentic workflows, intelligent automation, and custom AI tool development from Ensaar Global.',
  path: `/services/${SLUG}`,
});

export default function Page() {
  if (!service) return notFound();
  const url = `${siteConfig.url}/services/${SLUG}`;
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: service.name, description: service.shortDescription, url }),
          serviceSchema({
            name: service.name,
            description: service.shortDescription,
            url,
            serviceType: service.serviceType,
          }),
        ]}
      />
      <ServiceDetailPage service={service} />
    </>
  );
}
