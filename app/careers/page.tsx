import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, faqPageSchema, webPageSchema } from '@/components/seo/schemas';
import { TalentPoolForm } from '@/components/careers/TalentPoolForm';
import { pageMetadata } from '@/lib/metadata';
import { CAREERS_FAQ } from '@/lib/content/faq';
import { siteConfig } from '@/lib/utils';

const url = `${siteConfig.url}/careers`;
const trail = [
  { name: 'Home', url: siteConfig.url },
  { name: 'Careers', url },
];

const description =
  'Work with companies abroad while employed properly in India. Join the Ensaar talent pool for engineering, data, QA, product, and operations roles.';

export const metadata: Metadata = pageMetadata({
  title: 'Careers: Work With Global Companies, Employed in India',
  description,
  path: '/careers',
  eyebrow: 'Careers',
  keywords: [
    'jobs in India with foreign companies',
    'remote jobs India US company',
    'EOR employment India',
    'India engineering jobs',
    'work for overseas company from India',
  ],
});

const WHAT_YOU_GET = [
  'A proper Indian employment contract, not a contractor invoice arrangement',
  'Salary on time in rupees, with payslips and Form 16',
  'Statutory leave and holidays, with gratuity and provident fund as the law and Ensaar\'s policies provide',
  'The client team you work with day to day, and Ensaar for everything employment',
];

const HOW_IT_WORKS = [
  {
    title: 'You register here',
    detail: 'We keep your details and contact you when a client role matches what you actually do. We will not spam you with unrelated roles.',
  },
  {
    title: 'We introduce you to the client',
    detail: 'You interview with the company you would work with. They decide, and so do you. Ensaar does not push candidates into roles that do not fit.',
  },
  {
    title: 'Ensaar employs you',
    detail: 'You are employed in India by Ensaar, on a compliant contract, while working inside the client team.',
  },
  {
    title: 'You can move with the team',
    detail: 'When a client sets up their own Indian company, employees transfer across with their service continuity intact. That is the plan from the start, not a surprise.',
  },
];

export default function CareersPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: 'Careers at Ensaar', description, url, breadcrumb: trail }),
          breadcrumbSchema(trail, url),
          faqPageSchema(CAREERS_FAQ),
        ]}
      />

      <div className="pt-28 pb-14 md:pt-32">
        <Container>
          <Breadcrumbs items={[{ name: 'Careers', href: '/careers' }]} />
          <div className="max-w-3xl">
            <span className="eyebrow mb-5">Careers</span>
            <h1 className="mt-5 text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance">
              Work with companies abroad. Employed properly, here.
            </h1>
            <p className="mt-6 max-w-2xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-ink-secondary">
              Ensaar hires in India on behalf of companies in other countries. You work inside their
              team. We are your employer, which means a real contract, statutory leave and benefits, and
              a payslip every month, rather than the contractor arrangement these roles often become.
            </p>
          </div>
        </Container>
      </div>

      <section className="border-y border-line-subtle bg-bg-secondary py-16 md:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl">What you get</h2>
              <ul className="mt-6 flex flex-col gap-3">
                {WHAT_YOU_GET.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-secondary">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl">Being straight with you</h2>
              <p className="mt-6 leading-relaxed text-ink-secondary">
                We do not always have open roles, and we will not pretend otherwise. Ensaar is a small
                company hiring for specific client teams, so registering here is not an application to
                a vacancy. It means we have your details when a role appears that matches your work.
              </p>
              <p className="mt-4 leading-relaxed text-ink-secondary">
                We never charge a candidate a fee, for placement or anything else. If anyone claiming
                to represent Ensaar asks you for money, it is not us.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">How it works</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            From registering to a first payslip.
          </h2>
          <div className="mt-10 grid border-l border-t border-line-subtle sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="border-b border-r border-line-subtle p-6 md:p-7">
                <div className="font-mono text-xs text-accent-secondary">{String(index + 1).padStart(2, '0')}</div>
                <h3 className="mt-6 text-lg">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{step.detail}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line-subtle py-16 md:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="eyebrow mb-5">Join the talent pool</span>
              <h2 className="mt-5 text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
                Tell us what you do.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-secondary">
                Engineering, data, QA, product, and operations roles, from Hyderabad, Noida, and
                wherever else good people are. If your work is not on that list but you think it fits,
                write anyway.
              </p>
              <div className="mt-8 border-y border-line-subtle py-6">
                <div className="font-mono text-xs uppercase tracking-[0.12em] text-accent-secondary">
                  How we employ
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                  Ensaar is an equal opportunity employer. We hire on capability and we do not
                  discriminate on caste, religion, gender, disability, or any other protected ground.
                  Every workplace we run maintains the internal committee and policy that the POSH Act
                  requires.
                </p>
              </div>
            </div>
            <TalentPoolForm />
          </div>
        </Container>
      </section>

      <section className="border-t border-line-subtle py-16 md:py-20">
        <Container>
          <span className="eyebrow mb-5">Questions</span>
          <h2 className="mt-5 max-w-[720px] text-[clamp(2rem,4vw,3rem)] leading-tight text-balance">
            What candidates ask.
          </h2>
          <dl className="mt-10 border-t border-line-subtle">
            {CAREERS_FAQ.map((item) => (
              <div key={item.question} className="border-b border-line-subtle py-6">
                <dt className="font-display text-lg text-ink-primary">{item.question}</dt>
                <dd className="mt-3 max-w-3xl leading-relaxed text-ink-secondary">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
    </>
  );
}
