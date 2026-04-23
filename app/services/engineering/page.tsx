import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceSchema, webPageSchema } from '@/components/seo/schemas';
import { getService } from '@/lib/content/services';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const SLUG = 'engineering';
const service = getService(SLUG);

export const metadata: Metadata = pageMetadata({
  title: 'Engineering Design — Product Design & Prototyping',
  description:
    service?.shortDescription ||
    'Consumer product design and engineering — CAD/CAE, rapid prototyping, design for manufacture, from Ensaar Global.',
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
