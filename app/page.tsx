import type { Metadata } from 'next';
import { Hero } from '@/components/hero/Hero';
import { AboutSection } from '@/components/sections/AboutSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { BcepOverviewSection } from '@/components/sections/BcepOverviewSection';
import { PortfolioSection } from '@/components/sections/PortfolioSection';
import { AICapabilitiesSection } from '@/components/sections/AICapabilitiesSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Ensaar Global — AI-Powered Engineering & Technology Services',
  description:
    'Ensaar Global is an AI-powered engineering design and technology services company based in Hyderabad, India. We build intelligent solutions, deliver business excellence training, and advance enterprises into the AI era.',
  path: '/',
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'Home',
          description: siteConfig.description,
          url: siteConfig.url,
        })}
      />
      <Hero />
      <div id="below-hero" />
      <AboutSection />
      <ServicesSection />
      <BcepOverviewSection />
      <PortfolioSection />
      <AICapabilitiesSection />
      <ContactSection />
    </>
  );
}
