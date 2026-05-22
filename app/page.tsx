import type { Metadata } from 'next';
import { Hero } from '@/components/hero/Hero';
import { AboutSection } from '@/components/sections/AboutSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { WorkReductionSection } from '@/components/sections/WorkReductionSection';
import { PricingStripSection } from '@/components/sections/PricingStripSection';
import { CostComparisonSection } from '@/components/sections/CostComparisonSection';
import { CalculatorPreviewSection } from '@/components/sections/CalculatorPreviewSection';
import { IndustriesSection } from '@/components/sections/IndustriesSection';
import { AICaseStudiesSection } from '@/components/sections/AICaseStudiesSection';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { AICapabilitiesSection } from '@/components/sections/AICapabilitiesSection';
import { ContactSection } from '@/components/sections/ContactSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Ensaar Global - Managed AI Execution Pods',
  description:
    'Show Ensaar the work you want to reduce. We turn software backlogs, operations, support, research, staffing, and knowledge tasks into managed AI execution pods with senior oversight.',
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
      <WorkReductionSection />
      <PricingStripSection />
      <AboutSection />
      <ServicesSection />
      <CostComparisonSection />
      <CalculatorPreviewSection />
      <IndustriesSection />
      <AICaseStudiesSection limit={4} />
      <TestimonialsSection />
      <AICapabilitiesSection />
      <ContactSection />
    </>
  );
}
