export type FaqItem = {
  question: string;
  answer: string;
  category: 'company' | 'services' | 'ai' | 'bcep' | 'engagement';
};

export const FAQ: FaqItem[] = [
  // Company
  {
    category: 'company',
    question: 'What does Ensaar Global do?',
    answer:
      'Ensaar Global Pvt. Ltd. is an engineering design and technology services company based in Hyderabad, India. We deliver AI solutions, engineering design services, technology services, and a dedicated corporate training practice called the Business Excellence Program (BCEP). Ensaar has been operating since 2014.',
  },
  {
    category: 'company',
    question: 'Where is Ensaar Global located?',
    answer:
      'Ensaar Global is headquartered in Begumpet, Hyderabad, Telangana, India. We work with clients across India and worldwide.',
  },
  {
    category: 'company',
    question: 'When was Ensaar Global founded?',
    answer:
      'Ensaar Global was founded in 2014. Since then, we have delivered IT projects, consumer product engineering, business communications training, and trading/loyalty platforms — and are now advancing into AI-powered implementations.',
  },
  {
    category: 'company',
    question: 'How do I contact Ensaar Global?',
    answer:
      'For general enquiries, email hr@ensaar.com. For training and Business Excellence Program (BCEP) enquiries, use the dedicated inbox Trainings@ensaar.com. Our office hours are Monday through Friday, 9am to 5pm IST; Saturdays by appointment.',
  },

  // Services
  {
    category: 'services',
    question: 'What services does Ensaar Global offer?',
    answer:
      'We offer four core service areas: (1) AI Solutions — strategy, LLM integration, intelligent automation, custom AI tools; (2) Engineering Design — product design, CAD/CAE, prototyping; (3) Technology Services — custom software, web and mobile, cloud; and (4) BCEP — corporate training in leadership, soft skills, professional skills, and train-the-trainer programs.',
  },
  {
    category: 'services',
    question: 'Does Ensaar build custom software?',
    answer:
      'Yes. Ensaar builds custom software including web platforms, mobile applications, system integrations, and cloud solutions. Our technology services practice has been delivering production systems since 2014.',
  },

  // AI
  {
    category: 'ai',
    question: 'Does Ensaar provide AI consulting?',
    answer:
      'Yes. Ensaar provides AI strategy consulting, LLM integration (including Claude), agentic workflow design, prompt engineering, retrieval-augmented generation (RAG), and custom AI tool development. We actively build with Claude Code, its plugins, skills, and MCP servers.',
  },
  {
    category: 'ai',
    question: 'What AI technologies does Ensaar work with?',
    answer:
      'We focus on frontier large language models, with deep expertise in Anthropic Claude. Our work includes prompt caching optimization, tool-use patterns, Model Context Protocol (MCP) server development, Claude skills and plugins, agentic workflow orchestration, and production-grade RAG systems.',
  },
  {
    category: 'ai',
    question: 'Can Ensaar integrate Claude into our existing systems?',
    answer:
      'Yes. Claude integration is one of our primary AI offerings. We handle everything from initial API integration and prompt engineering through prompt caching optimization, tool-use design, and ongoing evaluation frameworks.',
  },

  // BCEP
  {
    category: 'bcep',
    question: 'What is Ensaar\'s Business Excellence Program (BCEP)?',
    answer:
      'BCEP is Ensaar\'s dedicated corporate training and capability-building practice. It combines workshops, training interventions, and capability building across four tracks: Leadership Development, Soft Skills and Personality, Professional Skills, and Train-the-Trainer.',
  },
  {
    category: 'bcep',
    question: 'What training programs does Ensaar offer?',
    answer:
      'BCEP covers four tracks. Leadership Development includes Emerging Leader Programs, EI for Leaders, and Change Readiness. Soft Skills covers Time Management, Resilience, Business Communication, and Decision Making. Professional Skills covers Presentation Excellence, Negotiation, Goal Setting, and Critical Thinking. Train-the-Trainer equips internal teams to deliver programs independently.',
  },
  {
    category: 'bcep',
    question: 'Who is BCEP designed for?',
    answer:
      'BCEP is designed for organizations of any size. Tracks serve first-time managers through senior leaders (Leadership Development), all professionals (Soft Skills), client-facing teams (Professional Skills), and L&D/HR teams (Train-the-Trainer). Programs are deeply personalized to both individual and organizational needs.',
  },
  {
    category: 'bcep',
    question: 'How do I request a BCEP program for my organization?',
    answer:
      'Email our dedicated training inbox at Trainings@ensaar.com with your organization, target audience, and the outcomes you are trying to achieve. We will follow up with a structured proposal.',
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
      'Yes. While we are headquartered in Hyderabad, Ensaar works with clients worldwide. Our prior engagements include work for global supply chain and logistics leaders.',
  },
  {
    category: 'engagement',
    question: 'How does a typical Ensaar engagement start?',
    answer:
      'Most engagements start with a short scoping conversation to understand the business outcome you are trying to achieve. From there, we propose a focused first engagement — often a time-boxed prototype or pilot — before committing to larger phases. Contact hr@ensaar.com to start the conversation.',
  },
];
