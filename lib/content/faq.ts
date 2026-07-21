export type FaqItem = {
  question: string;
  answer: string;
  category: 'company' | 'services' | 'ai' | 'bcep' | 'engagement' | 'pricing';
};

export const FAQ: FaqItem[] = [
  // Company
  {
    category: 'company',
    question: 'What does Ensaar Global do?',
    answer:
      'Ensaar Global Pvt. Ltd. helps students, engineers, and organizations adopt enterprise-grade AI. Services include AI strategy and enablement, software engineering, secure cloud deployment, AI-ready engineering teams, industry readiness, and BCEP AI readiness certification. Ensaar has operated since 2014.',
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
      'For AI, software, managed engineering, and Business Communication Excellence Program (BCEP) AI readiness certification enquiries, email info@ensaar.com. Our office hours are Monday through Friday, 9am to 5pm IST; Saturdays by appointment.',
  },

  // Services
  {
    category: 'services',
    question: 'What services does Ensaar Global offer?',
    answer:
      'Ensaar offers Enterprise AI Enablement for model strategy, engineering workflows, secure deployment, observability, governance, and adoption support; Software Development for web, mobile, SaaS, and enterprise applications; AI-Ready Engineering Teams; BCEP AI readiness certification; and industry readiness programs for students.',
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
    question: 'What are DailyByte AI Learn and AI Target?',
    answer:
      "DailyByte is Ensaar's practical AI enablement platform for individuals and enterprises. AI Learn gives learners guided applied work labs, AI Target turns a job description into an interactive learning path, and Daily Code lets people choose SQL, Python, Java, TypeScript, or AI work missions aligned to their target role.",
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
      'Email info@ensaar.com with the certification pathway, participant profile, AI readiness goal, and whether you are applying individually or for an enterprise cohort. Ensaar will confirm the pathway format, assessment model, and next intake.',
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
      'Ensaar is developing DailyByte as an AI Learn and AI Target platform for role-specific practice, job-specific preparation, Daily Code pathing, and capability evidence. Enterprise implementation services remain model-flexible and deployment-flexible. Clients are not required to move their operational AI systems into a proprietary architecture.',
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
      'Most engagements start with a short scoping conversation to understand the business outcome you are trying to achieve. From there, we propose a focused first engagement - often a time-boxed prototype or pilot - before committing to larger phases. Contact info@ensaar.com to start the conversation.',
  },
];
