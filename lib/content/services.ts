export type Service = {
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  serviceType: string;
  offerings: string[];
  outcomes: string[];
  accent: 'indigo' | 'cyan' | 'violet' | 'warm';
};

export const SERVICES: Service[] = [
  {
    slug: 'employer-of-record',
    name: 'Employer of Record in India',
    tagline: 'Hire in India without setting up a company',
    shortDescription:
      'Ensaar employs your hire in India as the legal employer, runs payroll and every statutory filing, and leaves you to manage the work. A monthly fee per employee, starting from $199, with no setup charge and a refundable one-month deposit.',
    longDescription:
      'Setting up an Indian entity to make your first two hires costs more in time and attention than the hires are worth. An Employer of Record removes that step: Ensaar issues a compliant Indian employment contract, pays salary in rupees, files provident fund, state insurance, professional tax, and TDS, accrues gratuity, and issues Form 16, while your managers direct the work exactly as they would for any other team member. Your IP and confidentiality terms are assigned to you in the employment contract. When headcount makes your own subsidiary the cheaper answer, the same team can move into it with their service continuity intact.',
    serviceType: 'Employer of Record and India Payroll Compliance',
    offerings: [
      'Compliant Indian employment contracts with IP assignment',
      'Monthly payroll in rupees, with payslips and Form 16',
      'Provident fund, ESI, professional tax, and TDS filings',
      'Gratuity accrual and statutory leave administration',
      'State-specific Shops and Establishments compliance',
      'Onboarding in five to ten working days',
      'Equipment, reimbursement, and access administration',
      'Lawful offboarding, and transfer to your own entity later',
    ],
    outcomes: [
      'An Indian hire working in weeks, not quarters',
      'Statutory filings that are somebody else\'s job',
      'One monthly fee per employee, with statutory costs passed through at cost',
      'A clean path to your own entity when the numbers justify it',
    ],
    accent: 'cyan',
  },
  {
    slug: 'gcc',
    name: 'India Capability Centres',
    tagline: 'Start with a pod, grow into your own centre',
    shortDescription:
      'A dedicated India team that starts at three to fifteen people employed through Ensaar, and converts into your own subsidiary when scale makes that cheaper. No entity required on day one.',
    longDescription:
      'Most India capability centre plans fail on sequencing, not ambition: an entity, a lease, and a leadership hire are committed before anyone knows whether the operating model works across time zones. Ensaar reverses the order. Your pod starts as people employed through our Employer of Record, working only for you and managed by you. Ensaar carries the India-side load: hiring, employment, payroll, equipment, access, and the monthly operational reporting. When the team is large enough that per-person fees exceed the cost of running a company, we incorporate your subsidiary, move the team across with their service continuity preserved, and hand over a centre that is already working.',
    serviceType: 'Global Capability Centre Setup and Managed India Operations',
    offerings: [
      'Role mix and location planning for an India team',
      'Recruitment at one month of salary per hire, with a 90-day replacement',
      'Employment and payroll through Ensaar as Employer of Record',
      'Equipment, security, and access administration',
      'A named India operations contact and monthly reporting',
      'Subsidiary incorporation and FDI filings when you convert',
      'Employee transfer into your entity with service continuity',
      'Transfer pricing and safe harbour groundwork for a captive',
    ],
    outcomes: [
      'A working India team before any entity exists',
      'Costs that scale with headcount instead of preceding it',
      'An exit from the pod model that was planned from the start',
      'Your own centre, running, when the maths supports it',
    ],
    accent: 'indigo',
  },
  {
    slug: 'ai-solutions',
    name: 'Enterprise AI Implementation',
    tagline: 'Build a controlled AI pilot',
    shortDescription:
      'Identify a valuable enterprise workflow, define the evidence and controls, build a focused AI pilot, and prepare the people and operating model required to scale it.',
    longDescription:
      'Ensaar begins with a workflow and a decision, not a model demonstration. We help teams test whether AI can create measurable value, build the surrounding application and integration layer, establish quality and security controls, and enable the people who will operate the result. Delivery can use Qwen, DeepSeek, Gemma-style, GPT-compatible, Claude, and other frontier models across AWS, Amazon Bedrock, cloud, or hybrid environments.',
    serviceType: 'Enterprise AI Implementation and Workforce Enablement',
    offerings: [
      'AI workflow diagnostic and opportunity mapping',
      'Focused proof of value and controlled pilot delivery',
      'Multi-model strategy and model evaluation',
      'Amazon Bedrock and AWS GPU deployment support',
      'VS Code and IDE-native AI engineering workflows',
      'Code generation, refactoring, testing, and documentation enablement',
      'Token, latency, utilization, and cost observability',
      'Cloud and hybrid deployment architecture',
      'Enterprise security and AI governance',
      'Team adoption, playbooks, and engineering support',
    ],
    outcomes: [
      'A clear decision on one valuable AI workflow',
      'Quality, security, and cost evidence before scaling',
      'Model choice without unnecessary lock-in',
      'An operable system and a team ready to own it',
    ],
    accent: 'indigo',
  },
  {
    slug: 'software-development',
    name: 'Software Development',
    tagline: 'Engineering that carries the product from idea to production',
    shortDescription:
      'Full-cycle web, mobile, SaaS, and enterprise application development with AI-assisted engineering, modern architecture, and accountable delivery.',
    longDescription:
      'Ensaar designs and builds software products that solve real operating problems. Our teams cover product definition, experience design, frontend, backend, integrations, cloud deployment, testing, and handover. AI-assisted engineering improves delivery speed, while senior technical review protects maintainability, security, and product quality.',
    serviceType: 'Custom Software Development and Product Engineering',
    offerings: [
      'Web and SaaS product development',
      'Mobile application development',
      'Enterprise application engineering',
      'API and platform integrations',
      'Legacy application modernization',
      'Cloud architecture and DevOps',
      'Quality engineering and test automation',
      'Product discovery and technical architecture',
    ],
    outcomes: [
      'A production-ready product, not a prototype handoff',
      'Faster engineering through controlled AI assistance',
      'Clear architecture and delivery ownership',
      'Software your internal team can operate and extend',
    ],
    accent: 'warm',
  },
  {
    slug: 'staffing',
    name: 'AI-Ready Engineering Teams',
    tagline: 'Add AI-fluent capacity with accountable support',
    shortDescription:
      'AI-fluent contributors, senior engineers, specialists, and architects who work inside your delivery system with Ensaar oversight and enablement.',
    longDescription:
      'Ensaar provides supported engineering capacity, not an anonymous resume marketplace. We place AI-fluent talent into client teams with clear delivery ownership, senior review paths, practical AI workflows, reporting cadence, and continued enablement as tools and models evolve.',
    serviceType: 'Managed Talent Augmentation and Staffing',
    offerings: [
      'AI-fluent software engineers',
      'Senior Pod Engineers',
      'AI Specialists for LLM, RAG, and agentic systems',
      'Solutions Architects for delivery governance',
      'Dedicated AI staffing pods',
      'Replacement guarantee in the first 4 weeks',
    ],
    outcomes: [
      'Capacity without slow hiring cycles',
      'Lower cost per shipped feature',
      'AI-native delivery practices from day one',
      'A managed partner, not a body shop',
    ],
    accent: 'cyan',
  },
  {
    slug: 'corporate-training',
    name: 'Corporate Training',
    tagline: 'Get BCEP Certified for AI-ready work',
    shortDescription:
      "BCEP is Ensaar's structured certification pathway for AI readiness, emotional intelligence, business communication, leadership execution, professional effectiveness, and enterprise capability building.",
    longDescription:
      "The Business Communication Excellence Program (BCEP) validates applied workplace capability through structured learning, practical assignments, and assessment. AI readiness and emotional intelligence are core threads across communication, leadership, execution, and internal enablement, helping people use AI responsibly, explain AI-assisted work clearly, work constructively with others, and perform effectively in AI-shaped workplaces.",
    serviceType: 'BCEP Professional Certification, AI Readiness, and Enterprise Capability Building',
    offerings: [
      'BCEP Leadership Certification',
      'BCEP Business Communication Certification',
      'BCEP Professional Excellence Certification',
      'BCEP Facilitator Certification',
      'AI readiness for professionals and enterprise cohorts',
      'Communication and judgment in AI-assisted work',
      'Emotional intelligence and self-awareness',
      'Workplace assignments and applied assessment',
      'Enterprise cohort certification pathways',
    ],
    outcomes: [
      'A clear professional certification milestone',
      'Practical AI readiness for modern workplace roles',
      'Demonstrated workplace communication capability',
      'Stronger emotional intelligence and interpersonal judgment',
      'Stronger leadership and execution standards',
      'Repeatable internal capability systems',
    ],
    accent: 'violet',
  },
];
