import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BcepOverviewSection } from '@/components/sections/BcepOverviewSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: "BCEP — Ensaar's Business Excellence Program",
  description:
    "Ensaar's Business Excellence Program (BCEP) delivers corporate workshops, training interventions, and capability building across Leadership Development, Soft Skills, Professional Skills, and Train-the-Trainer tracks.",
  path: '/bcep',
});

export default function BcepLandingPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'Business Excellence Program',
          description:
            'Corporate training and capability building in leadership, soft skills, professional skills, and train-the-trainer.',
          url: `${siteConfig.url}/bcep`,
        })}
      />
      <div className="pt-32 pb-8">
        <Container>
          <Breadcrumbs items={[{ name: 'BCEP', href: '/bcep' }]} />
        </Container>
      </div>
      <BcepOverviewSection />
    </>
  );
}
