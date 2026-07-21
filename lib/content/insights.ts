export type InsightSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Insight = {
  slug: string;
  title: string;
  description: string;
  category: string;
  published: string;
  updated: string;
  readingTime: string;
  image: string;
  imageAlt: string;
  summary: string[];
  sections: InsightSection[];
  faq: Array<{ question: string; answer: string }>;
  relatedOffer: { label: string; href: string };
};

export const INSIGHTS: Insight[] = [
  {
    slug: 'enterprise-ai-adoption-roadmap',
    title: 'Enterprise AI Adoption Roadmap: From Experiments to Governed Use',
    description:
      'A practical enterprise AI adoption roadmap covering workflows, model choice, infrastructure, governance, measurement, and team enablement.',
    category: 'AI Adoption',
    published: '2026-07-08',
    updated: '2026-07-15',
    readingTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1600&q=85&auto=format&fit=crop',
    imageAlt: 'Engineering team planning an enterprise AI adoption roadmap',
    summary: [
      'Begin with users and workflows before selecting a model.',
      'Define data boundaries, human review, and evaluation at the start.',
      'Choose a first use case that is measurable, reversible, and useful.',
      'Treat adoption as an operating model that joins technology and people.',
    ],
    sections: [
      {
        heading: 'Start with the operating need',
        paragraphs: [
          'Enterprise AI programs often begin with a model demonstration. A stronger starting point is a recurring workflow with a known owner, visible friction, representative examples, and a clear definition of an acceptable result.',
          'Map who performs the work, which systems provide context, where judgment is required, and what should happen when the AI is uncertain. This keeps the program connected to real use rather than a technology showcase.',
        ],
      },
      {
        heading: 'Design the control boundary',
        paragraphs: [
          'Before a pilot, decide what data may enter a model, which users may access the workflow, how outputs are reviewed, and which actions always require human approval. The control design should match the consequence of an error.',
        ],
        bullets: [
          'Data classification and model access rules',
          'Human review and escalation paths',
          'Evaluation criteria and representative test cases',
          'Prompt, output, latency, and cost observability',
        ],
      },
      {
        heading: 'Run a bounded first pilot',
        paragraphs: [
          'A useful first pilot has one user group, one workflow, a measurable baseline, and a reversible rollout. The objective is not only to prove that a model can generate an answer. It is to prove that the organization can operate the complete workflow safely and repeatedly.',
        ],
        bullets: [
          'Compare quality against an existing baseline',
          'Measure cycle time, rework, adoption, and operating cost',
          'Record failure patterns and uncertain cases',
          'Keep a clear stop, revise, or expand decision point',
        ],
      },
      {
        heading: 'Scale capability, not dependency',
        paragraphs: [
          'The long-term outcome should be an internal capability the organization understands. Document the model selection logic, deployment pattern, evaluation harness, operational controls, and team practices so the system can evolve without unnecessary provider or model lock-in.',
        ],
      },
    ],
    faq: [
      { question: 'What is the first step in enterprise AI adoption?', answer: 'Choose a real workflow with a clear owner, representative examples, a measurable baseline, and an agreed human review path.' },
      { question: 'How long should an enterprise AI pilot take?', answer: 'A focused pilot can often produce useful evidence in four to eight weeks when data access, users, and evaluation criteria are available.' },
      { question: 'Does enterprise AI adoption require a proprietary platform?', answer: 'No. An adoption program can use the organization\'s existing cloud, repositories, identity controls, IDEs, and approved model providers.' },
    ],
    relatedOffer: { label: 'Plan an AI adoption program', href: '/services/ai-solutions' },
  },
  {
    slug: 'multi-model-ai-strategy',
    title: 'Multi-Model AI Strategy for Enterprise Engineering Teams',
    description:
      'How to evaluate Qwen, DeepSeek, Gemma-style, GPT-compatible, and managed cloud models without creating avoidable lock-in.',
    category: 'Model Strategy',
    published: '2026-07-09',
    updated: '2026-07-15',
    readingTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=85&auto=format&fit=crop',
    imageAlt: 'Computing infrastructure supporting a multi-model enterprise AI strategy',
    summary: [
      'Select models by workload evidence, not a single leaderboard.',
      'Separate the application contract from the model provider.',
      'Evaluate quality, latency, cost, privacy, and operational fit together.',
      'Use routing only when the added complexity produces measurable value.',
    ],
    sections: [
      {
        heading: 'Why one model rarely fits every workload',
        paragraphs: [
          'Code completion, document analysis, customer interaction, structured extraction, and long-context reasoning have different requirements. The strongest model for one workload may be unnecessarily expensive, slow, or difficult to deploy for another.',
          'A multi-model strategy creates a repeatable way to compare options such as Qwen, DeepSeek, Gemma-style, GPT-compatible, and managed frontier models against the organization\'s actual tasks.',
        ],
      },
      {
        heading: 'Build a workload evaluation set',
        paragraphs: [
          'Create representative inputs, expected evidence, scoring criteria, and failure cases for each important workflow. Run the same set across candidate models and deployment patterns before choosing a default.',
        ],
        bullets: [
          'Task quality and groundedness',
          'Latency at expected concurrency',
          'Token and infrastructure cost',
          'Data handling and deployment constraints',
          'Tool use, structured output, and context requirements',
        ],
      },
      {
        heading: 'Keep the application portable',
        paragraphs: [
          'Use a stable internal contract for prompts, tools, structured outputs, evaluation, and telemetry. Provider-specific capabilities can still be used, but the core workflow should not depend on undocumented behavior that cannot be tested or replaced.',
          'Amazon Bedrock can provide managed access and enterprise controls for supported models. AWS GPU infrastructure or hybrid deployment may be appropriate when model hosting, data residency, or predictable utilization justifies the additional operating responsibility.',
        ],
      },
      {
        heading: 'Govern model changes like software changes',
        paragraphs: [
          'A model update can change output quality, latency, and cost. Version the configuration, run the evaluation set, compare telemetry, and use controlled rollout practices before changing a production default.',
        ],
      },
    ],
    faq: [
      { question: 'What is a multi-model AI strategy?', answer: 'It is a governed approach for selecting and operating different AI models based on workload quality, latency, cost, privacy, and deployment requirements.' },
      { question: 'Does multi-model mean every request needs routing?', answer: 'No. Many teams should begin with one approved model per workload and add dynamic routing only when evidence supports the extra complexity.' },
      { question: 'Can open-weight and managed models be used together?', answer: 'Yes. Open-weight models and managed model APIs can coexist when identity, data boundaries, evaluation, observability, and support responsibilities are defined.' },
    ],
    relatedOffer: { label: 'Review your model strategy', href: '/services/ai-solutions' },
  },
  {
    slug: 'ide-native-ai-engineering',
    title: 'IDE-Native AI Engineering: A Practical Enablement Guide',
    description:
      'A guide to using AI in VS Code and engineering workflows for code generation, refactoring, testing, documentation, review, and team learning.',
    category: 'AI Engineering',
    published: '2026-07-10',
    updated: '2026-07-15',
    readingTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1600&q=85&auto=format&fit=crop',
    imageAlt: 'Software engineer using an IDE for AI-assisted development',
    summary: [
      'AI should fit existing engineering controls and repositories.',
      'Use reusable context, tests, review rules, and small change boundaries.',
      'Measure accepted throughput, defects, and rework instead of prompts.',
      'Enable engineers to verify AI output rather than accept it by default.',
    ],
    sections: [
      {
        heading: 'Start inside the software lifecycle',
        paragraphs: [
          'IDE-native AI is most useful when it works with the repository, coding standards, tests, review process, and delivery pipeline already used by the team. The objective is dependable engineering throughput, not the volume of generated code.',
          'Begin with tasks where context and acceptance criteria are clear, such as test generation, constrained refactoring, documentation, code navigation, and implementation from a reviewed technical plan.',
        ],
      },
      {
        heading: 'Create a safe working method',
        paragraphs: [
          'Define which repositories and data the tool may access, how secrets are protected, which changes require senior review, and what evidence must accompany generated code. Keep change sets small enough for a human to understand.',
        ],
        bullets: [
          'Repository instructions and coding conventions',
          'Test and static analysis requirements',
          'Review ownership for security-sensitive areas',
          'Approved models, plugins, tools, and data boundaries',
        ],
      },
      {
        heading: 'Use context as an engineering asset',
        paragraphs: [
          'Reusable repository guidance, architecture notes, task templates, examples, and verification commands reduce repeated prompting and improve consistency. Keep this context versioned with the code when appropriate so the team can review and improve it.',
        ],
      },
      {
        heading: 'Measure outcomes that matter',
        paragraphs: [
          'Track accepted cycle time, review effort, escaped defects, rework, test coverage, and developer confidence. Token usage and latency are useful operating signals, but they should be interpreted alongside software quality and delivery outcomes.',
        ],
      },
    ],
    faq: [
      { question: 'What can IDE-native AI help engineers do?', answer: 'It can support code navigation, generation, refactoring, tests, documentation, review preparation, debugging, and repeatable engineering workflows.' },
      { question: 'How should AI-generated code be reviewed?', answer: 'Apply the same or stronger standards used for human-written code, including tests, static analysis, security review, architecture fit, and accountable human approval.' },
      { question: 'How do teams measure AI developer productivity?', answer: 'Measure accepted delivery cycle time, internal review effort, rework, defects, test quality, and developer experience rather than generated lines of code.' },
    ],
    relatedOffer: { label: 'Enable your engineering team', href: '/services/ai-solutions' },
  },
  {
    slug: 'rag-implementation-guide',
    title: 'RAG Implementation Guide: From Documents to Reliable Answers',
    description:
      'A practical RAG implementation guide covering source readiness, retrieval, evaluation, security, citations, rollout, and observability.',
    category: 'Knowledge AI',
    published: '2026-07-11',
    updated: '2026-07-15',
    readingTime: '9 min read',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=1600&q=85&auto=format&fit=crop',
    imageAlt: 'Organized documents and knowledge sources on a work table',
    summary: [
      'RAG quality begins with authoritative sources and representative questions.',
      'Evaluate retrieval and answer quality separately.',
      'Design citations, permissions, and abstention before launch.',
      'Roll out to one workflow with a measurable baseline and feedback path.',
    ],
    sections: [
      {
        heading: 'When RAG is the right pattern',
        paragraphs: [
          'Retrieval-augmented generation is useful when answers depend on changing private knowledge such as policies, manuals, tickets, product documentation, or internal research. It lets a model work from retrieved source material instead of relying only on pretraining.',
          'RAG is not automatically the right answer for structured calculations, transaction processing, or workflows that can be solved more reliably with a database query or deterministic rule.',
        ],
      },
      {
        heading: 'Prepare the source system',
        paragraphs: [
          'Identify authoritative sources, owners, update frequency, access restrictions, and duplicate or obsolete content. A retrieval system cannot reliably repair a knowledge base that has no source of truth.',
        ],
        bullets: ['Document inventory and ownership', 'Version and freshness rules', 'Permission groups', 'Representative user questions', 'Known failure and escalation cases'],
      },
      {
        heading: 'Build retrieval and answer evaluations',
        paragraphs: [
          'Test whether the relevant evidence is retrieved before tuning the final answer prompt. Create representative questions with expected evidence, answer criteria, and cases where the system should abstain.',
          'Evaluate retrieval recall, groundedness, citation quality, completeness, latency, and response cost. Keep the evaluation set in version control and run it whenever sources, prompts, models, or retrieval settings change.',
        ],
      },
      {
        heading: 'Plan security and rollout',
        paragraphs: [
          'Apply source permissions during retrieval, avoid placing secrets in prompts, log access appropriately, and define how users report an incorrect answer. Begin with one team or workflow, review failures, and expand only when the evaluation and operating process are stable.',
        ],
      },
    ],
    faq: [
      { question: 'How quickly can a RAG prototype be built?', answer: 'A focused system over prepared sources and one workflow can often be built and evaluated in two to four weeks. Source cleanup or complex permissions can extend the timeline.' },
      { question: 'Does RAG require model fine-tuning?', answer: 'Usually no. Retrieval, prompt design, source quality, and evaluation should be tested before considering model fine-tuning.' },
      { question: 'How can a RAG system reduce hallucinations?', answer: 'Require source-grounded answers, show citations, test abstention, evaluate retrieval separately, and preserve a human escalation path.' },
    ],
    relatedOffer: { label: 'Discuss a knowledge AI initiative', href: '/contact' },
  },
];

export function getInsight(slug: string) {
  return INSIGHTS.find((insight) => insight.slug === slug);
}
