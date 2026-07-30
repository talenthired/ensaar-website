import type { Metadata } from 'next';
import Image from 'next/image';
// Imported, not referenced by "/images/dailybyte/...". A string src keeps the
// same URL forever, and Next's image optimiser caches by (url, width, quality)
// without checking whether the file underneath changed, so refreshed
// screenshots kept serving the old bytes. Static imports are content-hashed:
// new bytes, new URL, nothing stale to serve.
import shotAiJobs from '@/public/images/dailybyte/dailybyte-ai-jobs.png';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Check,
  ClipboardCheck,
  GraduationCap,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { DailyByteGallery } from '@/components/marketing/DailyByteGallery';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema, faqPageSchema, softwareApplicationSchema, webPageSchema } from '@/components/seo/schemas';
import { pageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/utils';
import { dailyByteLinks } from '@/lib/dailybyte';

const description =
  'DailyByte is Ensaar Global\'s practical AI enablement platform for individuals and enterprises. AI Learn builds applied AI work skill, AI Jobs adapts learning to a specific job description, and Daily Code supports the target path.';

const FAQ_ITEMS = [
  {
    question: 'What are DailyByte AI Learn and AI Jobs?',
    answer:
      'DailyByte is a product being developed by Ensaar Global for practical AI enablement. AI Learn gives people guided work labs with source material and an AI assistant. AI Jobs turns a saved job description into skill modules, practice loops, Daily Code paths, and proof artifacts.',
  },
  {
    question: 'How is this different from an AI course?',
    answer:
      'A course usually measures content completion or a quiz. DailyByte is designed around applied work and job-specific preparation. A person must understand a brief or job requirement, direct AI, inspect evidence, verify the output, and produce a usable artifact.',
  },
  {
    question: 'Who is DailyByte for?',
    answer:
      'DailyByte is intended for students, recent graduates, software engineers, data and product professionals, enterprise teams, colleges, and learning leaders who need practical evidence of AI capability.',
  },
  {
    question: 'Can an organization run a cohort pilot?',
    answer:
      'Yes. Ensaar can shape a focused pilot around the roles, workflows, capability goals, and reporting needs of an engineering organization, business team, or college cohort.',
  },
  {
    question: 'How do I start using DailyByte?',
    answer:
      'Individuals can create a DailyByte account and begin with AI Learn or AI Jobs. Enterprise users can create a team workspace or speak with Ensaar about a cohort, capability pilot, or role-specific AI enablement rollout.',
  },
] as const;

const STEPS = [
  {
    icon: BriefcaseBusiness,
    title: 'Receive work that resembles the role',
    detail: 'A realistic brief, source files, constraints, and a clear deliverable replace generic prompting exercises.',
  },
  {
    icon: Bot,
    title: 'Direct AI through a real workspace',
    detail: 'The assistant can inspect files and use tools. The learner decides what to ask, what to challenge, and what to verify.',
  },
  {
    icon: ClipboardCheck,
    title: 'Submit a work artifact',
    detail: 'The result is judged against the brief, while the interaction process reveals verification habits and practical judgment.',
  },
  {
    icon: BarChart3,
    title: 'Turn activity into capability evidence',
    detail: 'Individuals receive coaching signals. Program leaders can see progress, strengths, and focus areas across a cohort.',
  },
] as const;

export const metadata: Metadata = pageMetadata({
  title: 'DailyByte AI Learn and AI Jobs for Students, Engineers, and Teams',
  description,
  path: '/ai-work-lab',
  eyebrow: 'DailyByte',
  keywords: [
    'DailyByte AI Learn',
    'DailyByte AI Jobs',
    'Daily Code',
    'job specific AI learning',
    'AI work simulation',
    'AI skills assessment',
    'AI capability pilot',
  ],
});

export default function AIWorkLabPage() {
  const url = `${siteConfig.url}/ai-work-lab`;
  const trail = [
    { name: 'Home', url: siteConfig.url },
    { name: 'DailyByte', url },
  ];
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: 'DailyByte AI Learn and AI Jobs', description, url, breadcrumb: trail }),
          breadcrumbSchema(trail, url),
          softwareApplicationSchema({
            name: 'DailyByte',
            description,
            url,
            featureList: [
              'AI Learn guided work labs',
              'AI Jobs learning paths built from a real job description',
              'Daily Code path setup for SQL, Python, Java, TypeScript, and AI work',
              'In-browser AI assistant with tools',
              'Realistic source files and work artifacts',
              'Process and outcome measurement',
              'Individual coaching signals',
              'Team capability insights',
            ],
          }),
          faqPageSchema(FAQ_ITEMS.map((item) => ({ question: item.question, answer: item.answer }))),
        ]}
      />

      <section className="relative isolate overflow-hidden bg-[#071a34] pb-14 pt-24 text-white md:pb-18 md:pt-32 lg:min-h-[720px] lg:pt-36">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-brand" aria-hidden />
        <div className="absolute inset-y-0 right-0 hidden w-[55%] bg-[#102d30] lg:block" aria-hidden />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:72px_72px]" aria-hidden />
        <div className="container-page relative grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.11em] text-cyan-200">
              <span className="h-px w-10 bg-[#f5a623]" aria-hidden />
              Ensaar product / DailyByte
            </div>
            <h1 className="mt-6 max-w-[620px] text-[clamp(2.35rem,4.4vw,4.35rem)] leading-[1.03] text-balance">
              Learn AI through work. Target the job you want.
            </h1>
            <p className="mt-6 max-w-xl text-[clamp(1rem,1.25vw,1.18rem)] leading-relaxed text-slate-200">
              DailyByte<sup className="align-super text-[0.6em] font-medium leading-none">™</sup> combines AI Learn for guided applied work, AI Jobs for job-description-based preparation, and Daily Code paths that keep core skills aligned to the role.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={dailyByteLinks.individual} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-md bg-[#f5a623] px-7 py-4 text-base font-semibold text-[#0c2343] transition hover:-translate-y-0.5 hover:bg-[#f7b83e]">
                For Individuals <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
              <a href={dailyByteLinks.enterprise} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-md border border-white/35 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10">
                For Enterprises <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </a>
            </div>
            <p className="mt-6 text-sm text-slate-400">Individuals can begin directly. Enterprises and campuses can use DailyByte as part of a wider AI enablement or capability pilot.</p>
          </div>

          <div className="relative lg:pl-4 xl:-mr-8">
            <div className="mb-3 flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-emerald-100/70">
              <span>AI Learn and AI Jobs</span><span>Product UI preview</span>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden border border-white/15 bg-black shadow-[0_35px_90px_rgba(0,0,0,0.4)] lg:aspect-[16/9.6]">
              <Image
                src={shotAiJobs}
                alt="DailyByte AI Jobs role preparation page"
                width={1188}
                height={768}
                priority
                className="h-full w-full object-cover object-left-top"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg-primary py-20 md:py-28">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.76fr_1.24fr]">
            <div>
              <span className="eyebrow">Why This Exists</span>
              <h2 className="mt-6 text-[clamp(2.3rem,4.8vw,4.4rem)] leading-[1.02] text-balance">AI fluency has to survive contact with real work.</h2>
            </div>
            <div className="max-w-3xl lg:justify-self-end">
              <p className="text-xl leading-relaxed text-ink-secondary">
                Knowing model names, prompt patterns, or course concepts is not the same as producing dependable work with AI. Capability appears when a person can frame the task, use the right evidence, challenge the output, and know when human judgment must take over.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  'AI Learn labs instead of toy prompts',
                  'AI Jobs paths based on a real job description',
                  'Daily Code choices that match the target role',
                  'Feedback on process, outcome, and proof readiness',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 border-t border-line-subtle pt-4 text-sm font-semibold text-ink-primary">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-secondary" aria-hidden />{item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 grid border-l border-t border-line-subtle md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, detail }, index) => (
              <article key={title} className="border-b border-r border-line-subtle p-7 md:min-h-[310px]">
                <div className="flex items-center justify-between text-accent-secondary">
                  <span className="font-mono text-xs">0{index + 1}</span><Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-12 text-xl leading-tight">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{detail}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#102d30] py-20 text-white md:py-28">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[#91e5d7]">Inside the product</div>
              <h2 className="mt-6 text-[clamp(2.3rem,4.8vw,4.4rem)] leading-[1.02] text-balance">The work, the workspace, and the capability view.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-emerald-50/75 lg:justify-self-end">
              These animated product views are modeled on the current DailyByte interface. The preview covers AI Learn, AI Jobs, Daily Code path setup, and capability evidence.
            </p>
          </div>
          <div className="mt-12"><DailyByteGallery /></div>
        </Container>
      </section>

      <section className="bg-bg-secondary py-20 md:py-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="border-t-4 border-[#f5a623] bg-bg-primary p-8 md:p-10">
              <GraduationCap className="h-7 w-7 text-accent-secondary" aria-hidden />
              <div className="mt-8 text-xs font-semibold uppercase tracking-[0.1em] text-accent-secondary">For individuals</div>
              <h2 className="mt-3 text-3xl leading-tight">Use AI Learn for skill and AI Jobs for the job you want.</h2>
              <p className="mt-5 leading-relaxed text-ink-secondary">Start with guided applied labs, save a target job, learn every requirement interactively, and build proof that can survive an interview.</p>
              <a href={dailyByteLinks.individual} target="_blank" rel="noreferrer" className="group mt-7 inline-flex items-center gap-2 border-b border-ink-primary pb-1 text-sm font-semibold text-ink-primary transition hover:text-accent-primary">For Individuals<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></a>
            </div>
            <div className="border-t-4 border-[#59d8c8] bg-bg-primary p-8 md:p-10">
              <UsersRound className="h-7 w-7 text-accent-secondary" aria-hidden />
              <div className="mt-8 text-xs font-semibold uppercase tracking-[0.1em] text-accent-secondary">For enterprises and campuses</div>
              <h2 className="mt-3 text-3xl leading-tight">Run AI enablement around real roles, not generic awareness.</h2>
              <p className="mt-5 leading-relaxed text-ink-secondary">Shape a cohort around target roles, AI Learn labs, Daily Code paths, and proof artifacts, then use readiness signals to guide the next enablement investment.</p>
              <a href={dailyByteLinks.enterprise} target="_blank" rel="noreferrer" className="group mt-7 inline-flex items-center gap-2 border-b border-ink-primary pb-1 text-sm font-semibold text-ink-primary transition hover:text-accent-primary">For Enterprises<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></a>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-bg-primary py-20 md:py-28">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <span className="eyebrow">Questions</span>
              <h2 className="mt-6 text-4xl leading-tight">What prospective users ask first.</h2>
            </div>
            <div className="border-t border-line-subtle">
              {FAQ_ITEMS.map((item, index) => (
                <details key={item.question} className="group border-b border-line-subtle py-5" open={index === 0}>
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-lg font-semibold text-ink-primary">
                    {item.question}<span className="text-2xl font-normal text-accent-secondary transition group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-4 max-w-3xl leading-relaxed text-ink-secondary">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[#071a34] py-16 text-white md:py-20">
        <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-200"><ShieldCheck className="h-4 w-4" aria-hidden /> Start with real work</div>
            <h2 className="mt-4 max-w-3xl text-3xl leading-tight md:text-4xl">Choose AI Learn, add a role in AI Jobs, and build job-specific evidence of how you work with AI.</h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a href={dailyByteLinks.individual} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-md bg-[#f5a623] px-6 py-3.5 text-sm font-semibold text-[#0c2343] transition hover:bg-[#f7b83e]">For Individuals<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></a>
            <Link href="/contact" className="group inline-flex items-center gap-2 rounded-md border border-white/30 px-6 py-3.5 text-sm font-semibold transition hover:bg-white/10">Talk to Ensaar<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></Link>
          </div>
        </Container>
      </section>
    </>
  );
}
