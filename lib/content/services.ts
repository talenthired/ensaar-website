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
    tagline: 'From AI strategy to shipped intelligence',
    shortDescription:
      'Leverage cutting-edge AI — large language models, agentic workflows, and custom tooling — to transform how your business operates.',
    longDescription:
      'Ensaar builds production AI systems. We design, integrate, and deploy solutions powered by frontier models like Claude, leveraging prompt caching, tool-use, MCP servers, and the rapidly expanding Claude Code ecosystem. Our AI engagements start with a crisp problem definition, move through rapid prototyping with real data, and culminate in deployed, measurable systems — not demos.',
    serviceType: 'AI Consulting and Development',
    offerings: [
      'AI strategy and roadmap consulting',
      'Claude and LLM integration (with prompt caching)',
      'Agentic workflow design (MCP servers, Claude skills, Claude plugins)',
      'Intelligent automation for operations and support',
      'AI-powered analytics and insight generation',
      'Custom AI tool development and internal platforms',
      'Retrieval-augmented generation (RAG) and knowledge systems',
      'Prompt engineering and evaluation frameworks',
    ],
    outcomes: [
      'Measurable operational efficiency gains',
      'Faster, higher-quality decision support',
      'Reduced manual processing cost',
      'Durable internal AI capability, not vendor lock-in',
    ],
    accent: 'indigo',
  },
  {
    slug: 'engineering',
    name: 'Engineering Design',
    tagline: 'From concept to production-ready designs',
    shortDescription:
      'Consumer product design and engineering that bridges creativity with manufacturability.',
    longDescription:
      'Our engineering design practice combines decades of consumer product experience with modern CAD/CAE workflows. We take products from first sketch through design optimization, rapid prototyping, and production handoff — with an eye on both user experience and supply-chain reality.',
    serviceType: 'Engineering Design Services',
    offerings: [
      'Product design and engineering',
      'CAD/CAE solutions',
      'Rapid prototyping',
      'Design for manufacture (DFM)',
      'Design optimization',
      'Consumer product development',
    ],
    outcomes: [
      'Reduced time-from-sketch-to-production',
      'Fewer late-stage engineering change orders',
      'Designs optimized for cost and manufacturability',
    ],
    accent: 'cyan',
  },
  {
    slug: 'technology',
    name: 'Technology Services',
    tagline: 'End-to-end software built for scale',
    shortDescription:
      'Custom software, web and mobile applications, system integration, and cloud solutions.',
    longDescription:
      'Since 2014, Ensaar has delivered IT solutions across industries. We build custom software — web platforms, mobile applications, integrations — and provide cloud and IT consulting services. Every engagement starts with a clear understanding of the business outcome we are accountable for.',
    serviceType: 'Technology Services',
    offerings: [
      'Custom software development',
      'Web and mobile applications',
      'System integration',
      'Cloud architecture and migration',
      'IT consulting',
      'Platform engineering',
    ],
    outcomes: [
      'Reliable, scalable systems',
      'Faster product release cycles',
      'Reduced integration friction',
    ],
    accent: 'violet',
  },
];

export function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}
