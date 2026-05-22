import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ContactSection } from '@/components/sections/ContactSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Contact Ensaar Global',
  description: `Get in touch with Ensaar Global. General enquiries: ${siteConfig.email}. Training and BCEP enquiries: ${siteConfig.trainingEmail}.`,
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema({
          name: 'Contact',
          description: 'Get in touch with Ensaar Global - general and training enquiries.',
          url: `${siteConfig.url}/contact`,
        })}
      />
      <div className="pt-32 pb-8">
        <Container>
          <Breadcrumbs items={[{ name: 'Contact', href: '/contact' }]} />
        </Container>
      </div>
      <ContactSection />
    </>
  );
}
