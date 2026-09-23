import type { Metadata } from 'next';
import { Hero } from '@/components/hero/Hero';
import { ConversionOffersSection } from '@/components/sections/ConversionOffersSection';
import { DailyByteSection } from '@/components/sections/DailyByteSection';
import { EnterpriseAISection } from '@/components/sections/EnterpriseAISection';
import { IndustriesSection } from '@/components/sections/IndustriesSection';
import { AICaseStudiesSection } from '@/components/sections/AICaseStudiesSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { BcepCertificationCta } from '@/components/sections/BcepCertificationCta';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Employer of Record and Capability Centres in India',
  description: siteConfig.description,
  path: '/',
  eyebrow: siteConfig.tagline,
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'Home',
          description: siteConfig.description,
          url: siteConfig.url,
          about: siteConfig.knowsAbout,
        })}
      />
      <Hero />
      <ConversionOffersSection />
      {/* AI sits below the India services now. It is one of the things Ensaar
          sells rather than the reason the company exists, and the homepage
          should read in that order. */}
      <EnterpriseAISection />
      <DailyByteSection />
      <AICaseStudiesSection limit={4} />
      <IndustriesSection />
      <BcepCertificationCta />
      <TestimonialsSection />
      <ContactSection />
    </>
  );
}
