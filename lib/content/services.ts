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
