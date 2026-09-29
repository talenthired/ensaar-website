export type FaqItem = {
  question: string;
  answer: string;
  category: 'company' | 'services' | 'ai' | 'bcep' | 'engagement' | 'pricing' | 'india' | 'careers';
};

/** Candidate questions. Rendered on /careers and in /faq. */
export const CAREERS_FAQ: FaqItem[] = [
  {
    category: 'careers',
    question: 'Do you have open roles right now?',
    answer:
      'Sometimes, and sometimes not. Ensaar hires for specific client teams rather than maintaining a standing list of vacancies, so registering puts you in front of us when a matching role appears. We would rather tell you that than publish roles that do not exist.',
  },
  {
    category: 'careers',
    question: 'Who would I actually work for?',
    answer:
      'Ensaar employs you in India and is your legal employer: the contract, payroll, provident fund, and Form 16 come from us. Your day-to-day work sits with the client company and their managers. It is one job, with employment and work responsibilities split between two organisations.',
  },
  {
    category: 'careers',
    question: 'Do you charge candidates anything?',
    answer:
      'No, never, for any reason. Our fees are paid by the client company. If someone claiming to represent Ensaar asks you for a placement fee, a training fee, or a deposit, it is not us, and we would like to know about it.',
  },
  {
    category: 'careers',
    question: 'What happens if the client opens their own company in India?',
    answer:
      'You transfer to it, with your service continuity preserved, which matters for gratuity and notice. Your provident fund follows you through your UAN. This is planned from the first hire rather than handled as an afterthought.',
  },
];

/**
 * Employer of Record questions.
 *
 * Kept as its own export so the EOR page can render exactly these and emit them
 * as FAQPage structured data, while they still reach /faq and the EnAI
 * assistant through the combined FAQ array below. Prices and statutory rates
 * here must match `lib/content/india.ts`; a test asserts it.
 */
export const EOR_FAQ: FaqItem[] = [
  {
    category: 'india',
    question: 'What is an Employer of Record in India?',
    answer:
      'An Employer of Record is the company that legally employs someone on your behalf. Ensaar issues the Indian employment contract, pays the salary in rupees, and files provident fund, state insurance, professional tax, and TDS. You direct the work day to day. It is how a foreign company hires in India without first registering a company there.',
  },
  {
    category: 'india',
    question: 'How much does an Employer of Record cost in India?',
    answer:
      'Ensaar charges a flat $199 per employee per month, with no setup fee, no security deposit, and no minimum term. On top of that you pay the salary itself and the statutory employer contributions, both passed through at cost. India specialists generally charge $99 to $399 and global platforms $499 to $699 for the same hire.',
  },
  {
    category: 'india',
    question: 'How quickly can we hire someone in India?',
    answer:
      'Five to ten working days from the point we have the candidate details and documents is typical, and it can be faster when documents arrive clean. If Ensaar is also finding the candidate, add the recruitment time, which depends on the role.',
  },
  {
    category: 'india',
    question: 'What does an employer pay on top of salary in India?',
    answer:
      'Provident fund at 12% of basic pay, commonly applied on the statutory wage ceiling of Rs 15,000 so about Rs 1,800 a month; state insurance at 3.25% of gross, only where gross is Rs 21,000 a month or below; gratuity accrued at about 4.81% of basic; and professional tax set by each state, typically Rs 200 a month and capped at Rs 2,500 a year. That adds roughly 13% to 18% at junior and mid salaries, and proportionally less at senior salaries because provident fund is capped.',
  },
  {
    category: 'india',
    question: 'Does hiring through an EOR create permanent establishment risk in India?',
    answer:
      'Not automatically, and an EOR does not automatically protect you either. Permanent establishment turns on conduct, mainly whether someone in India habitually concludes contracts in your name or a fixed place of business is treated as yours. An engineer building your product sits differently from a salesperson closing your deals. Ensaar will say which side of that line a role sits on before you hire.',
  },
  {
    category: 'india',
    question: 'Who owns the work and the IP?',
    answer:
      'You do. IP assignment and confidentiality terms sit in the employment contract Ensaar issues to the employee, and in the service agreement between Ensaar and you, so the rights land with you rather than with the employer of record.',
  },
  {
    category: 'india',
    question: 'Can we move EOR employees into our own Indian entity later?',
    answer:
      'Yes, and it is worth planning for from the start. When your own subsidiary becomes the cheaper option, Ensaar incorporates it and transfers the team across with their service continuity preserved, which matters for gratuity and for notice. Employees keep their provident fund through their UAN.',
  },
  {
    category: 'india',
    question: 'What happens when an employee resigns or has to be let go?',
    answer:
      'Ensaar runs the exit: notice period as written in the contract, final settlement, statutory dues, and the paperwork. Indian dismissal rules are more prescriptive than in the US, so a termination needs cause, documentation, and notice. We will tell you what is possible before you commit to a decision.',
  },
];

/** India capability centre questions. Rendered on /services/gcc and in /faq. */
export const GCC_FAQ: FaqItem[] = [
  {
    category: 'india',
    question: 'What is a GCC, and do we need one?',
    answer:
      'A global capability centre is a team in India that belongs to you rather than to a vendor, doing continuing work such as engineering, data, or support. You need one when the work is ongoing and you want the knowledge to stay in your organisation. If the work is a fixed project with an end date, a contract with a services firm is usually the better instrument.',
  },
  {
    category: 'india',
    question: 'Can we start with fewer than ten people?',
    answer:
      'Yes, and most companies should. Ensaar starts teams at three to fifteen people employed through our Employer of Record, which needs no Indian entity, no lease, and no local registration. It tests the operating model, the time zone overlap, and the hiring profile before anything structural is committed.',
  },
  {
    category: 'india',
    question: 'When does our own Indian entity become cheaper than an EOR?',
    answer:
      'Usually somewhere past twenty to thirty people. Below that, per-person fees are smaller than the cost and management attention of running an Indian company with its own filings, audit, and compliance calendar. Above it, the arithmetic reverses. The crossover depends on salary levels, so it is worth recalculating rather than assuming.',
  },
  {
    category: 'india',
    question: 'How long does it take to incorporate an Indian subsidiary?',
    answer:
      'Seven to ten working days with clean documents. A foreign parent can own 100% under the automatic FDI route in most sectors. You need at least two directors, one of whom must have been resident in India for 182 days or more in the previous calendar year, and that requirement is the most common cause of delay.',
  },
  {
    category: 'india',
    question: 'How is a captive centre paid by its parent company?',
    answer:
      'On a cost-plus basis: the India entity recovers its costs plus a margin, because it serves only its parent and has no external revenue. Budget 2026 set a uniform 15.5% safe harbour margin for IT and ITeS services and raised the eligibility threshold to Rs 2,000 crore, which keeps most new centres out of transfer pricing disputes.',
  },
  {
    category: 'india',
    question: 'What does Ensaar charge to build an India team?',
    answer:
      'Recruitment is 8.33% of annual salary per hire, which is one month, charged when the person joins, with a 90-day replacement. Employment through our Employer of Record is $199 per person per month, with salary and statutory costs passed through at cost. Converting to your own entity is quoted per engagement once the structure is known.',
  },
];

export const FAQ: FaqItem[] = [
  ...EOR_FAQ,
  ...GCC_FAQ,
  ...CAREERS_FAQ,
  // Company
  {
    category: 'company',
    question: 'What does Ensaar Global do?',
    answer:
      'Ensaar Global Pvt. Ltd. helps companies outside India build teams inside it. We act as Employer of Record so you can hire in India without your own entity, build those teams into capability centres and later into your own subsidiary, and deliver software engineering and practical AI enablement with the same people. Ensaar has operated since 2014 from Hyderabad and Noida.',
  },
  {
    category: 'company',
    question: 'Where is Ensaar Global located?',
    answer:
      'Ensaar Global has locations in Hyderabad, Telangana and Noida, Uttar Pradesh. We work with students, engineering teams, institutions, and companies across India and worldwide.',
  },
  {
    category: 'company',
    question: 'When was Ensaar Global founded?',
    answer:
      'Ensaar Global was founded in 2014. Since then, we have delivered software platforms, product engineering, international technology engagements, and enterprise capability programs. AI is now integrated across our engineering and delivery model.',
  },
  {
    category: 'company',
    question: 'How do I contact Ensaar Global?',
    answer:
      'For AI, software, managed engineering, and Business Communication Excellence Program (BCEP) AI readiness certification enquiries, email support@ensaar.com. Our office hours are Monday through Friday, 9am to 5pm IST; Saturdays by appointment.',
  },

  // Services
  {
    category: 'services',
    question: 'What services does Ensaar Global offer?',
    answer:
      'Six: Employer of Record in India, so you can hire without an entity; India capability centres that start as a small pod and can convert into your own subsidiary; Enterprise AI Enablement covering model strategy, engineering workflows, deployment, observability, and governance; Software Development for web, mobile, SaaS, and enterprise applications; AI-Ready Engineering Teams; and BCEP certification for AI readiness and business communication.',
  },
  {
    category: 'services',
    question: 'Does Ensaar provide staffing or talent placement?',
    answer:
      'Yes. Ensaar provides managed AI-augmented contributors, senior engineers, AI specialists, product talent, and architects. It is not a resume marketplace. Ensaar handles vetting, workflow setup, senior review paths, and reporting cadence.',
  },

  // AI
  {
    category: 'ai',
    question: 'Does Ensaar provide AI consulting?',
    answer:
      'Yes. Ensaar provides enterprise AI strategy, model evaluation, LLM integration, IDE-native engineering enablement, agentic workflow design, retrieval-augmented generation, deployment architecture, observability, security, and governance support.',
  },
  {
    category: 'ai',
    question: 'What AI technologies does Ensaar work with?',
    answer:
      'Ensaar supports multi-model strategies across Qwen, DeepSeek, Gemma-style, GPT-compatible, Claude, and other frontier models. Deployment and engineering support can include Amazon Bedrock, AWS GPU infrastructure, VS Code workflows, Model Context Protocol integrations, RAG, evaluation, and real-time observability.',
  },
  {
    category: 'ai',
    question: 'Can Ensaar integrate Claude into our existing systems?',
    answer:
      'Yes. Claude integration is one of our primary AI offerings. We handle everything from initial API integration and prompt engineering through prompt caching optimization, tool-use design, and ongoing evaluation frameworks.',
  },
  {
    category: 'ai',
    question: 'What are DailyByte AI Learn and AI Jobs?',
    answer:
      "DailyByte is Ensaar's practical AI enablement platform for individuals and enterprises. AI Learn gives learners guided applied work labs, AI Jobs turns a job description into an interactive learning path, and Daily Code lets people choose SQL, Python, Java, TypeScript, or AI work missions aligned to their target role.",
  },
  {
    category: 'ai',
    question: 'How does Ensaar measure practical AI capability?',
    answer:
      'The DailyByte approach evaluates whether a person can understand a work brief or job requirement, direct AI effectively, inspect source material, verify important claims, improve weak output, and submit useful proof. This creates separate signals for process, outcome, role readiness, and practical judgment.',
  },
  {
    category: 'ai',
    question: 'Can our company or college run an AI capability pilot?',
    answer:
      'Yes. Ensaar can shape a focused cohort pilot around relevant roles, workflows, source material, capability goals, and reporting needs. The purpose is to establish practical evidence of readiness before a larger enablement investment.',
  },

  // BCEP
  {
    category: 'bcep',
    question: 'What is Ensaar\'s Business Communication Excellence Program (BCEP)?',
    answer:
      'BCEP is Ensaar\'s Business Communication Excellence Program. AI readiness and emotional intelligence are core capabilities across its Leadership Execution, Business Communication, Professional Excellence, and Enterprise Facilitation pathways. Participants complete structured learning, workplace application, and an assessed demonstration before certification.',
  },
  {
    category: 'bcep',
    question: 'What BCEP certifications does Ensaar offer?',
    answer:
      'BCEP offers four pathways: Leadership Execution, Business Communication, Professional Excellence, and Enterprise Facilitator. Each pathway includes AI readiness where relevant, role-relevant application, an assessment rubric, and an Ensaar-issued credential.',
  },
  {
    category: 'bcep',
    question: 'Who is BCEP designed for?',
    answer:
      'BCEP is designed for individual professionals, company-sponsored cohorts, and AI readiness programs. Pathways serve managers and leaders, client-facing and cross-functional professionals, execution-focused business teams, internal enterprise facilitators, and teams preparing for AI-assisted work.',
  },
  {
    category: 'bcep',
    question: 'How do I start BCEP certification?',
    answer:
      'Email support@ensaar.com with the certification pathway, participant profile, AI readiness goal, and whether you are applying individually or for an enterprise cohort. Ensaar will confirm the pathway format, assessment model, and next intake.',
  },
  {
    category: 'bcep',
    question: 'How can I verify an Ensaar or BCEP certificate?',
    answer:
      'Use the official certificate verification page at ensaar.com/verify. Enter the certificate number or upload its QR code, confirm the validation request by email OTP, and review the holder, credential purpose, issuer, validity, and current registry status.',
  },

  // Engagement model
  {
    category: 'engagement',
    question: 'Is Ensaar offering a proprietary AI platform?',
    answer:
      'Ensaar is developing DailyByte as an AI Learn and AI Jobs platform for role-specific practice, job-specific preparation, Daily Code pathing, and capability evidence. Enterprise implementation services remain model-flexible and deployment-flexible. Clients are not required to move their operational AI systems into a proprietary architecture.',
  },
  {
    category: 'engagement',
    question: 'Can we begin with a focused AI pilot?',
    answer:
      'Yes. A focused pilot can validate one engineering workflow, model choice, knowledge use case, or governance pattern before adoption expands. Ensaar defines the success criteria, implementation boundary, evaluation approach, and handover path with the client.',
  },
  {
    category: 'engagement',
    question: 'Can Ensaar work with our existing cloud and developer tools?',
    answer:
      'Yes. Ensaar can work with existing cloud, source control, CI/CD, IDE, observability, security, and collaboration environments. The enablement plan is adapted to the organization rather than requiring a wholesale tool replacement.',
  },
  {
    category: 'engagement',
    question: 'How is an Ensaar AI engagement scoped?',
    answer:
      'Scoping begins with the audience, business or engineering objective, current tools, security boundaries, data constraints, and adoption stage. Ensaar then recommends a practical sequence for discovery, pilot, enablement, deployment, and continued support.',
  },

  // Engagement
  {
    category: 'engagement',
    question: 'What industries does Ensaar work with?',
    answer:
      'Ensaar has delivered work across supply chain and logistics, fintech and customer loyalty, education and STEM, and more. We are currently focused on expanding our AI engagements across sectors where large language models create clear operational leverage.',
  },
  {
    category: 'engagement',
    question: 'Does Ensaar work with clients outside India?',
    answer:
      'Yes. Ensaar operates from Hyderabad, Telangana and Noida, Uttar Pradesh, and works with clients worldwide. Prior engagements include work for global supply chain and logistics leaders.',
  },
  {
    category: 'engagement',
    question: 'How does a typical Ensaar engagement start?',
    answer:
      'Most engagements start with a short scoping conversation to understand the business outcome you are trying to achieve. From there, we propose a focused first engagement - often a time-boxed prototype or pilot - before committing to larger phases. Contact support@ensaar.com to start the conversation.',
  },
];
