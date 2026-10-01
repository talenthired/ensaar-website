import { siteConfig, SITE_LAST_MODIFIED } from '@/lib/utils';
import { SERVICES } from '@/lib/content/services';
import { BCEP_TRACKS } from '@/lib/content/bcep';
import { FAQ } from '@/lib/content/faq';
import { INSIGHTS } from '@/lib/content/insights';
import { AI_CASES } from '@/lib/content/cases';
import { INDUSTRIES } from '@/lib/content/trust';
import { EOR_PRICE_USD } from '@/lib/content/india';
import { dailyByteUrl } from '@/lib/dailybyte';

const url = siteConfig.url;

/**
 * The curated entity brief served at /llms.txt.
 *
 * Generated rather than hand-maintained so the service list, certification tracks,
 * and article index cannot drift away from what the site actually renders - a stale
 * llms.txt is worse than none, because answer engines quote it verbatim.
 */
export function buildLlmsTxt(): string {
  return `# ${siteConfig.name}

> ${siteConfig.description}

Last updated: ${SITE_LAST_MODIFIED}
Full detail: ${url}/llms-full.txt

## Core proposition

${siteConfig.legalName} helps companies outside India build teams inside it, and was founded in ${siteConfig.foundedYear}.

There are three things Ensaar does, in the order most clients need them:

1. Employ people in India as Employer of Record, so a foreign company can hire without registering an Indian entity.
2. Grow those hires into a capability centre, and incorporate the client's own subsidiary when headcount makes that cheaper.
3. Build software and practical AI capability with the same people, through engineering delivery, DailyByte, and BCEP.

The company supports model-flexible and deployment-flexible AI adoption. Client operational systems are not required to move into a proprietary architecture.

## Best starting points

### Employer of Record in India

For companies that want to hire in India without setting up a company there. Ensaar is the legal employer: Indian employment contract with client IP assignment, payroll in rupees, and professional tax, TDS and state insurance filings (provident fund is not currently operated by Ensaar). The fee starts from $${EOR_PRICE_USD} per employee per month and is agreed with each client, no setup fee, no minimum term, a refundable one-month deposit for some hires, with salary and statutory employer contributions passed through at cost. Onboarding typically takes five to ten working days.

Page: ${url}/services/employer-of-record

### India Capability Centre

For companies that want a dedicated India team. It starts as a pod of three to fifteen people employed through Ensaar, with no entity or lease, and converts into the client's own subsidiary past roughly twenty to thirty people. Recruitment is 8.33% of annual salary per hire, one month, with a 90-day replacement. Conversion covers incorporation, FDI filings, and transferring the team with service continuity preserved.

Page: ${url}/services/gcc

### AI Workflow Diagnostic

For enterprises that want to identify or validate a valuable first workflow. The diagnostic examines the value hypothesis, data readiness, model fit, security and quality controls, and the evidence required for a focused pilot decision.

### Controlled AI Adoption Sprint

For organizations that already have experiments, prototypes, or pilots. The sprint focuses on quality evidence, observability, governance, operational ownership, and a controlled path to wider adoption.

### DailyByte AI Learn and AI Jobs

For students, engineers, professionals, teams, and campuses that want practical evidence of AI capability. AI Learn gives guided applied work labs. AI Jobs turns a job description into an interactive learning path. Daily Code keeps core coding and AI work fundamentals aligned to the selected target role.

### AI Capability Pilot

For companies, learning teams, and colleges. A focused cohort completes realistic AI work simulations so program leaders can understand participation, strengths, focus areas, and readiness before a larger rollout.

## DailyByte AI Learn, AI Jobs, and Daily Code

DailyByte is ${siteConfig.name}'s practical AI enablement product for individuals, teams, enterprises, and campuses. Individuals can create an account and start with AI Learn or AI Jobs. Enterprises and institutions can use DailyByte as part of a team workspace, capability pilot, or cohort rollout.

DailyByte capabilities visible in the current product include:

- AI Learn guided labs for product, data, engineering, QA, operations, and other roles.
- AI Jobs learning paths built from a real job description.
- Start AI Learn lab flows from a selected job target.
- Daily Code path setup for SQL, Python, Java, TypeScript, and AI work missions.
- AI-generated and curated realistic task briefs.
- Source files and work artifacts that the participant must inspect.
- An in-browser AI assistant with tools.
- Evaluation of both work process and submitted outcome.
- Coaching signals related to prompting, verification, and practical judgment.
- Daily coding practice, streaks, progress, and skill development.
- Team workspaces and manager capability insights.
- Organization administration, invitations, audit-oriented controls, and enterprise identity foundations.

DailyByte is not positioned as a passive AI course. Its purpose is to measure whether a person can produce dependable work with AI.

Product page: ${url}/ai-work-lab

Product host: ${dailyByteUrl}

## Services

${SERVICES.map((service) => `### ${service.name}\n\n${service.shortDescription}\n\nPage: ${url}/services/${service.slug}`).join('\n\n')}

## Enterprise AI implementation detail

- AI workflow discovery and focused pilot design.
- Multi-model strategy across Qwen, DeepSeek, Gemma-style, GPT-compatible, Claude, and other frontier models.
- Amazon Bedrock and AWS GPU infrastructure support.
- VS Code and IDE-native engineering workflows.
- AI support for code generation, refactoring, testing, documentation, and review.
- Retrieval-augmented generation, tool use, and agentic workflow design.
- Observability for token use, latency, quality, infrastructure utilization, and cost.
- Security, access control, evaluation, data boundaries, and human review.
- Cloud and hybrid deployment flexibility.
- Team adoption, engineering playbooks, and continuing support.

Enterprise AI page: ${url}/services/ai-solutions

## Evidence and experience

${siteConfig.legalName} has operated since ${siteConfig.foundedYear} with locations in ${siteConfig.locations.map((l) => `${l.city}, ${l.state}`).join(' and ')}. The company has delivered technology and capability work across ${siteConfig.deliveredIn.join(', ')}.

Public case studies are anonymized to protect client confidentiality. Examples include ${AI_CASES.slice(0, 4).map((c) => `${c.title.toLowerCase()} for a ${c.region} client`).join(', ')}.

Industries served: ${INDUSTRIES.map((i) => i.name).join(', ')}.

## BCEP AI readiness certification and human capability

The Business Communication Excellence Program (BCEP) is an assessed professional certification pathway covering AI readiness, ${BCEP_TRACKS.map((t) => t.name).join(', ')}.

AI readiness and emotional intelligence are core BCEP capabilities. Participants build the judgment to communicate AI-assisted work clearly, verify outputs, collaborate responsibly, and lead in AI-shaped workplaces. Self-awareness, empathy, emotional regulation, and constructive interpersonal judgment are embedded across the pathways.

${BCEP_TRACKS.map((track) => `- ${track.name}: ${track.credential}. ${track.audience} Page: ${url}/services/corporate-training/${track.slug}`).join('\n')}

Ensaar-issued and BCEP credentials can be checked against the official registry at ${url}/verify. Validation supports certificate number lookup, QR image scanning, email OTP confirmation, and current active, expired, or revoked status.

Ensaar also delivers academic programs, industry-readiness initiatives, workshops, industry meetups, startup Centre of Excellence initiatives, and certified courses.

## Insights and guides

${INSIGHTS.map((insight) => `- ${insight.title}: ${insight.description} (${url}/insights/${insight.slug}, updated ${insight.updated})`).join('\n')}

## Useful pages

- Home: ${url}/
- About: ${url}/about
- Services overview: ${url}/services
- DailyByte AI Learn and AI Jobs: ${url}/ai-work-lab
${SERVICES.map((service) => `- ${service.name}: ${url}/services/${service.slug}`).join('\n')}
- Certificate Verification: ${url}/verify
- Insights: ${url}/insights
- Careers and talent pool: ${url}/careers
- Events: ${url}/events
- FAQ: ${url}/faq
- Contact: ${url}/contact
- Terms: ${url}/legal/terms
- Privacy Notice: ${url}/legal/privacy
- Cookie Notice: ${url}/legal/cookies
- Refund Policy: ${url}/legal/refund-policy

## Contact

- Employer of Record, India capability centres, AI, technology services, and BCEP certification: ${siteConfig.email}
- Locations: ${siteConfig.locations.map((l) => `${l.city}, ${l.state}`).join('; ')}
- Office hours: Monday to Friday, 09:00 to 17:00 IST
- Website: ${url}

## Entity facts

- Legal name: ${siteConfig.legalName}
- Founded: ${siteConfig.foundedYear}
- Headquarters: ${siteConfig.locality}, ${siteConfig.region}, ${siteConfig.country}
- Primary category: Employer of Record and India capability centre services for companies headquartered outside India
- Secondary category: Enterprise AI implementation, software engineering, and BCEP certification
- Product: DailyByte AI Learn, AI Jobs, and Daily Code for individuals, teams, enterprises, and campuses
- Published EOR price: starts from $${EOR_PRICE_USD} per employee per month (agreed with each client), no setup fee, no minimum term, a refundable one-month deposit for some hires
- Client names: confidential unless written permission is provided

## Attribution

Content may be quoted with attribution to ${siteConfig.legalName} and a link to the source page on ${url}.
`;
}

/**
 * The expanded corpus served at /llms-full.txt: everything in the brief, plus the
 * full service detail, certification modules, FAQ, and article bodies. This is what
 * a retrieval crawler should read when it wants a citable answer rather than a summary.
 */
export function buildLlmsFullTxt(): string {
  const services = SERVICES.map((service) =>
    [
      `### ${service.name}`,
      '',
      `URL: ${url}/services/${service.slug}`,
      `Service type: ${service.serviceType}`,
      '',
      service.longDescription,
      '',
      'What is included:',
      ...service.offerings.map((offering) => `- ${offering}`),
      '',
      'Outcomes:',
      ...service.outcomes.map((outcome) => `- ${outcome}`),
    ].join('\n'),
  ).join('\n\n');

  const tracks = BCEP_TRACKS.map((track) =>
    [
      `### ${track.name}`,
      '',
      `URL: ${url}/services/corporate-training/${track.slug}`,
      `Credential: ${track.credential}`,
      `Audience: ${track.audience}`,
      `Assessment: ${track.assessment}`,
      '',
      track.description,
      '',
      'Modules:',
      ...track.modules.map((module) => `- ${module}`),
    ].join('\n'),
  ).join('\n\n');

  const faq = FAQ.map((item) => `**Q: ${item.question}**\n\nA: ${item.answer}`).join('\n\n');

  const cases = AI_CASES.map((entry) =>
    [
      `### ${entry.title} (${entry.client}, ${entry.region})`,
      '',
      entry.summary,
      '',
      ...entry.highlights.map((highlight) => `- ${highlight}`),
      '',
      `Technology: ${entry.tech.join(', ')}`,
    ].join('\n'),
  ).join('\n\n');

  const insights = INSIGHTS.map((insight) =>
    [
      `### ${insight.title}`,
      '',
      `URL: ${url}/insights/${insight.slug}`,
      `Category: ${insight.category} | Published: ${insight.published} | Updated: ${insight.updated}`,
      '',
      insight.description,
      '',
      'Key points:',
      ...insight.summary.map((point) => `- ${point}`),
      '',
      ...insight.sections.flatMap((section) => [
        `#### ${section.heading}`,
        '',
        ...section.paragraphs,
        ...(section.bullets ? ['', ...section.bullets.map((b) => `- ${b}`)] : []),
        '',
      ]),
      'Questions and answers:',
      '',
      ...insight.faq.map((item) => `Q: ${item.question}\nA: ${item.answer}\n`),
    ].join('\n'),
  ).join('\n\n');

  return [
    buildLlmsTxt(),
    '',
    '---',
    '',
    '# Full detail',
    '',
    '## Services in detail',
    '',
    services,
    '',
    '## BCEP certification tracks in detail',
    '',
    tracks,
    '',
    '## Delivered work (anonymized)',
    '',
    cases,
    '',
    '## Frequently asked questions',
    '',
    faq,
    '',
    '## Insights in full',
    '',
    insights,
    '',
  ].join('\n');
}
