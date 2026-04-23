import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PortfolioSection } from '@/components/sections/PortfolioSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Our Work — Selected Engagements Across Industries',
  description:
    'A decade of shipped solutions across logistics, fintech, education, and robotics. Ensaar Global respects client confidentiality — engagement details available on request.',
  path: '/work',
});

export default function WorkPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'Our Work',
          description:
            'Selected client engagements across supply chain, fintech, education, and robotics.',
          url: `${siteConfig.url}/work`,
        })}
      />
      <div className="pt-32 pb-8">
        <Container>
          <Breadcrumbs items={[{ name: 'Work', href: '/work' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">Our Work</span>
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] mt-5 mb-6 text-balance">
              A decade of <span className="gradient-text">shipped solutions.</span>
            </h1>
            <p className="text-xl text-ink-secondary">
              Since 2014, Ensaar has delivered engagements across supply chain and logistics, fintech and customer loyalty, education and robotics, and more. Client names are confidential; engagement references are available on request.
            </p>
          </div>
        </Container>
      </div>
      <PortfolioSection />
    </>
  );
}
