import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceDetailSchemas } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';

const service = SERVICES.find((item) => item.slug === 'ai-solutions')!;

export const metadata: Metadata = pageMetadata({
  title: 'Enterprise AI Workflow Diagnostics, Pilots, and Implementation',
  description: service.shortDescription,
  path: '/services/ai-solutions',
  eyebrow: 'Enterprise AI',
  keywords: [
    'enterprise AI implementation',
    'AI workflow diagnostic',
    'AI pilot design',
    'multi-model AI strategy',
    'Amazon Bedrock consulting',
    'RAG development company',
    'AI governance and observability',
  ],
});

export default function AISolutionsPage() {
  return <><JsonLd data={serviceDetailSchemas(service)} /><ServiceDetailPage service={service} /></>;
}
