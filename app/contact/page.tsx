import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { ContactSection } from '@/components/sections/ContactSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';

const url = `${siteConfig.url}/contact`;
const trail = [
  { name: 'Home', url: siteConfig.url },
  { name: 'Contact', url },
];

export const metadata: Metadata = pageMetadata({
  title: 'Start an Enterprise AI or AI Capability Conversation',
  description: `Bring Ensaar one workflow, role, or cohort. Request an AI workflow diagnostic, AI capability pilot, software discussion, BCEP AI readiness certification, or event collaboration. Individuals and teams can begin directly through DailyByte. General enquiries: ${siteConfig.email}.`,
  path: '/contact',
  eyebrow: 'Contact',
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({
            name: 'Contact Ensaar Global',
            description: 'Contact Ensaar about enterprise AI, software engineering, BCEP AI readiness certification, academic programs, and events.',
            url,
            type: 'ContactPage',
            breadcrumb: trail,
          }),
          breadcrumbSchema(trail, url),
        ]}
      />

      <section className="relative isolate overflow-hidden bg-[#0c2343] pb-20 pt-32 text-white md:pb-24 md:pt-40">
        <Image
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=2000&q=88&auto=format&fit=crop"
          alt="Professionals and students taking part in a collaborative learning session"
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,24,51,0.98),rgba(5,24,51,0.88)_58%,rgba(5,24,51,0.5))]" />
        <div className="absolute inset-y-0 left-0 -z-10 w-1.5 bg-gradient-brand" aria-hidden />

        <Container>
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.1em] text-cyan-200">Home / Contact</div>
            <h1 className="mt-7 text-[clamp(2.7rem,6vw,5.2rem)] leading-[0.99] text-balance">
              Bring one workflow, one role, or one cohort.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-200 md:text-xl">
              Tell us where AI should create value or where people need practical capability. We will help define the evidence, controls, and first step that make the decision easier.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
              From campus to corporate, we also deliver BCEP AI readiness workshops, academic programs, industry meetups, Centre of Excellence initiatives for startups, and certified courses. Interested in attending, hosting, or inviting us? Get in touch.
            </p>
            <div className="mt-8 flex flex-wrap gap-5">
              <Link href="#contact" className="inline-flex items-center gap-2 bg-[#f5a623] px-6 py-3.5 font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]">
                Get a starting point
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/events" className="inline-flex items-center gap-2 border-b border-cyan-200 pb-1 font-semibold text-cyan-100 transition hover:text-white">
                View events and programs
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <ContactSection />
    </>
  );
}
