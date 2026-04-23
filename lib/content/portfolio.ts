export type CaseStudy = {
  id: string;
  industry: string;
  title: string;
  description: string;
  tags: string[];
  accent?: boolean;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'logistics-training',
    industry: 'Global Supply Chain & Logistics',
    title: 'Business Communications Training Platform',
    description:
      'Designed and delivered a comprehensive business communications training program for a Fortune-scale logistics enterprise — improving internal communication across distributed teams and geographies.',
    tags: ['Enterprise', 'Training', 'Logistics'],
  },
  {
    id: 'trading-loyalty',
    industry: 'Fintech & Customer Loyalty',
    title: 'Trading & Loyalty Platform',
    description:
      'Built a full-stack trading and customer loyalty platform enabling businesses to drive repeat engagement through intelligent incentive design and AI-informed recommendations.',
    tags: ['Platform', 'AI-Informed', 'E-commerce'],
  },
  {
    id: 'robotics-edu',
    industry: 'Education & STEM',
    title: 'Robotics Education for Children',
    description:
      'Developed engaging robotics education programs introducing children to STEM through hands-on robot building and programming workshops.',
    tags: ['EdTech', 'Robotics', 'STEM'],
  },
  {
    id: 'ai-native',
    industry: 'Current: AI-Native Implementations',
    title: 'AI-Powered Client Solutions',
    description:
      'Currently delivering AI-native engagements leveraging Claude, Claude Code, and the Anthropic ecosystem of plugins and skills — this very website is one small example.',
    tags: ['AI', 'Claude Code', 'Agentic'],
    accent: true,
  },
];
