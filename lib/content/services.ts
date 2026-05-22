export type Service = {
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  serviceType: string;
  offerings: string[];
  outcomes: string[];
  accent: 'indigo' | 'cyan' | 'violet';
};

export const SERVICES: Service[] = [
  {
    slug: 'ai-solutions',
    name: 'AI Solutions',
    tagline: 'Turn workflows into managed AI pods',
    shortDescription:
      'Production AI systems for products, operations, support, research, and knowledge work. Start with an audit, a feature pod, a knowledge automation pod, or an AI software pod.',
    longDescription:
      'Ensaar builds production AI systems that reduce expensive work. We design, integrate, and deploy solutions powered by frontier models like Claude using prompt caching, tool use, MCP servers, Claude Code workflows, RAG, and evaluation harnesses. The goal is not AI theater. The goal is measurable reduction in manual effort, delivery cost, and cycle time.',
    serviceType: 'Managed AI Solutions and Automation',
    offerings: [
      'AI cost reduction audits',
      'Knowledge automation and RAG systems',
      'Claude feature pods for existing products',
      'AI-native MVP builds',
      'Support and operations automation',
      'Research and analysis desks',
      'Agentic workflow design',
      'Evaluation and governance frameworks',
    ],
    outcomes: [
      'Reduced manual processing cost',
      'Faster delivery against product backlogs',
      'Lower support and research workload',
      'AI capability your team can keep using',
    ],
    accent: 'indigo',
  },
  {
    slug: 'staffing',
    name: 'Staffing',
    tagline: 'Managed AI-augmented capacity',
    shortDescription:
      'AI-fluent contributors, senior engineers, AI specialists, and architects placed into your workflow with Ensaar oversight, reporting, and replacement guarantee.',
    longDescription:
      'Ensaar staffing is not a resume marketplace. We place AI-augmented talent into client teams with a managed delivery cadence, senior review paths, and clear performance visibility. Execution capacity can start at $7/hr, while senior tiers cover architecture, AI specialization, and multi-team delivery governance.',
    serviceType: 'Managed Talent Augmentation and Staffing',
    offerings: [
      'Execution Specialists from $7/hr',
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
    tagline: 'Train teams for the AI-shifted workplace',
    shortDescription:
      "Ensaar's Business Excellence Program (BCEP) develops leadership, soft skills, professional skills, and internal training capability for teams adapting to AI-era work.",
    longDescription:
      "Ensaar's corporate training practice, BCEP, combines corporate know-how with structured skill development. Programs are practical, scalable, outcome-focused, and deeply personalized. As AI changes how teams work, BCEP helps people communicate, lead, decide, and train more effectively.",
    serviceType: 'Corporate Training and Capability Building',
    offerings: [
      'Leadership Development',
      'Soft Skills and Personality',
      'Professional Skills Enhancement',
      'Train-the-Trainer programs',
      'Business communication training',
      'AI-era workplace readiness workshops',
    ],
    outcomes: [
      'Sharper communication and execution',
      'Leadership readiness during transformation',
      'More accountable and confident teams',
      'Internal training systems that scale',
    ],
    accent: 'violet',
  },
];
