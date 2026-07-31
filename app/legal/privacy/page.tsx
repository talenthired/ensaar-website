import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Notice',
  description: 'How Ensaar Global collects, uses, stores, and protects information submitted through this website.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  const url = `${siteConfig.url}/legal/privacy`;
  return (
    <>
      <JsonLd data={[
        webPageSchema({
          name: 'Privacy Notice',
          description: metadata.description as string,
          url,
          breadcrumb: [{ name: 'Home', url: siteConfig.url }, { name: 'Privacy Notice', url }],
        }),
        breadcrumbSchema([{ name: 'Home', url: siteConfig.url }, { name: 'Privacy Notice', url }], url),
      ]} />
      <div className="pt-32 pb-10">
        <Container>
          <Breadcrumbs items={[{ name: 'Privacy Notice', href: '/legal/privacy' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow">Legal</span>
            <h1 className="mt-6 text-[clamp(2.3rem,5vw,4rem)]">Privacy notice</h1>
            <p className="mt-5 text-lg text-ink-secondary">How we handle information submitted through ensaar.com.</p>
          </div>
        </Container>
      </div>
      <Section>
        <Container>
          <article className="max-w-3xl space-y-10 text-[1rem] leading-relaxed text-ink-secondary">
            <Policy title="Information we collect">
              We collect information you provide in a work brief, calculator request, or email. This
              can include your name, business email, phone number, company, requested work, current
              cost range, timeline, and message. We also record the first landing page, referrer, and
              campaign parameters used to reach the site.
            </Policy>
            <Policy title="How we use it">
              We use the information to evaluate the request, prepare a relevant response, manage the
              opportunity, improve our marketing, prevent misuse, and maintain records related to a
              potential or active business engagement. We do not sell submitted personal information.
            </Policy>
            <Policy title="Where it is stored">
              Website requests are stored in Ensaar&apos;s private lead workspace. Production storage may
              be provided by contracted infrastructure providers acting on our behalf. Access is
              restricted to people who need the information for sales, delivery, administration, or
              security.
            </Policy>
            <Policy title="Retention">
              We keep enquiry information while it is useful for responding to the request, managing a
              business relationship, meeting legal obligations, or resolving disputes. Information
              that is no longer needed is deleted or anonymized under our operating procedures.
            </Policy>
            <Policy title="Your choices">
              You may ask us to correct or delete information you submitted, subject to legal and
              contractual obligations. You can also ask us not to use your information for future
              marketing communication.
            </Policy>
            <Policy title="Contact">
              Send privacy questions or requests to <a className="underline" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
              Include enough information for us to identify the relevant request.
            </Policy>
          </article>
        </Container>
      </Section>
    </>
  );
}

function Policy({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-3 text-2xl text-ink-primary">{title}</h2><p>{children}</p></section>;
}
