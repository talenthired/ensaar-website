import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { serviceDetailSchemas } from '@/components/seo/schemas';
import { ServiceDetailPage } from '@/components/sections/ServiceDetailPage';
import { pageMetadata } from '@/lib/metadata';
import { SERVICES } from '@/lib/content/services';

const service = SERVICES.find((item) => item.slug === 'staffing')!;

export const metadata: Metadata = pageMetadata({
  title: 'AI-Ready Engineering Teams',
  description: service.shortDescription,
  path: '/services/staffing',
  eyebrow: 'Engineering teams',
  keywords: [
    'AI augmented staffing',
    'AI-fluent software engineers',
    'managed engineering pods',
    'staff augmentation India',
    'AI specialists for LLM and RAG',
  ],
});

export default function StaffingPage() {
  return <><JsonLd data={serviceDetailSchemas(service)} /><ServiceDetailPage service={service} /></>;
}
