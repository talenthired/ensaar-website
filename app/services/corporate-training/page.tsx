import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { itemListSchema, serviceDetailSchemas } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { BcepOverviewSection } from '@/components/sections/BcepOverviewSection';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';
import { BCEP_TRACKS } from '@/lib/content/bcep';
import { siteConfig } from '@/lib/utils';

const service = SERVICES.find((item) => item.slug === 'corporate-training')!;

export const metadata: Metadata = pageMetadata({
  title: 'Get BCEP Certified - AI Readiness and Business Communication Excellence',
  description: service.shortDescription,
  path: '/services/corporate-training',
  eyebrow: 'BCEP certification',
  keywords: [
    'BCEP certification',
    'AI readiness certification',
    'business communication certification',
    'emotional intelligence training',
    'corporate training India',
    'leadership execution certification',
  ],
});

export default function CorporateTrainingPage() {
  const url = `${siteConfig.url}/services/${service.slug}`;
  return <><JsonLd data={[
    ...serviceDetailSchemas(service),
    itemListSchema({
      name: 'BCEP certification tracks',
      url,
      items: BCEP_TRACKS.map((track) => ({
        name: track.credential,
        url: `${url}/${track.slug}`,
        description: track.description,
      })),
    }),
  ]} /><ServiceDetailPage service={service} /><BcepOverviewSection /></>;
}
