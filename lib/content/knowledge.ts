import { FAQ } from './faq';

/**
 * Grounded knowledge base for the EnAI assistant.
 *
 * EnAI answers ONLY from these curated, human-written entries. It never generates
 * free-form text, so it cannot hallucinate: a question either matches a known
 * answer with enough confidence, or it is handed to the contact form. This is the
 * deliberate trade for accuracy on a marketing site.
 *
 * `cta` tells the UI which action to attach to an answer:
 *   individual -> DailyByte individual signup
 *   enterprise -> DailyByte enterprise signup
 *   pricing    -> DailyByte plans
 *   contact    -> lead / contact form
 */
export type KnowledgeCta = 'individual' | 'enterprise' | 'pricing' | 'contact' | null;

export interface KnowledgeEntry {
  id: string;
  question: string;
  /** Extra terms and synonyms that should match this entry, beyond the question words. */
  keywords: string[];
  answer: string;
  cta?: KnowledgeCta;
}

/**
 * India services: Employer of Record and capability centres.
 *
 * These carry heavy keyword lists on purpose. A buyer types "can you run payroll
 * in india" or "do we need an entity", not the question as written, and the
 * matcher scores keyword hits above answer prose. Every figure here must match
 * `lib/content/india.ts`, which `test/india-content.test.ts` checks.
 */
const INDIA_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'in-eor',
    question: 'What is Employer of Record and can Ensaar hire someone in India for us?',
    keywords: [
      'eor', 'employer of record', 'hire in india', 'hiring in india', 'employ', 'employment',
      'legal employer', 'without entity', 'no entity', 'india hire', 'record',
    ],
    answer:
      'Yes. Ensaar acts as the legal employer in India so you can hire without registering a company there. We issue the Indian employment contract with your IP terms, pay salary in rupees, and file provident fund, state insurance, professional tax, and TDS. You manage the work day to day. Onboarding usually takes five to ten working days.',
    cta: 'contact',
  },
  {
    id: 'in-eor-price',
    question: 'How much does Employer of Record cost in India?',
    keywords: [
      'eor cost', 'eor price', 'eor pricing', 'cost per employee', 'per employee per month',
      'how much', 'price', 'pricing', 'fee', 'rate', 'charges', 'deposit', 'setup fee',
    ],
    answer:
      'Ensaar\'s fee starts from $199 per employee per month and is agreed with each client, with no setup fee and no minimum term. Before each employee starts you pay a refundable deposit of one month\'s total cost for that employee, returned when they leave. Salary and statutory employer contributions are passed through at cost. For comparison, India specialists usually charge $99 to $399 and global platforms $499 to $699 for the same hire.',
    cta: 'contact',
  },
  {
    id: 'in-statutory',
    question: 'What statutory costs does an employer pay in India?',
    keywords: [
      'statutory', 'pf', 'epf', 'provident fund', 'esi', 'esic', 'gratuity', 'professional tax',
      'tds', 'payroll', 'employer cost', 'contributions', 'form 16', 'uan', 'compliance',
    ],
    answer:
      'Provident fund at 12% of basic, commonly applied on the Rs 15,000 wage ceiling so about Rs 1,800 a month; state insurance at 3.25% of gross where gross is Rs 21,000 or below; gratuity accrued at about 4.81% of basic; and state professional tax, typically Rs 200 a month and capped at Rs 2,500 a year. Together that is roughly 13% to 18% on top of gross at junior and mid salaries, and less at senior salaries because provident fund is capped.',
    cta: 'contact',
  },
  {
    id: 'in-pe',
    question: 'Does an EOR create permanent establishment risk in India?',
    keywords: [
      'permanent establishment', 'pe risk', 'pe', 'tax risk', 'taxable presence', 'corporate tax',
      'exposure', 'liability',
    ],
    answer:
      'Not automatically, and an EOR does not automatically protect you either. Permanent establishment turns on conduct, mainly whether someone in India habitually concludes contracts in your name. An engineer building your product is a different case from a salesperson closing your deals. Ensaar will tell you which side of that line a role sits on before you hire.',
    cta: 'contact',
  },
  {
    id: 'in-gcc',
    question: 'Can Ensaar help us set up a GCC or capability centre in India?',
    keywords: [
      'gcc', 'capability centre', 'capability center', 'global capability', 'captive',
      'offshore development centre', 'odc', 'india team', 'build a team', 'pod', 'centre', 'center',
      'build operate transfer', 'bot',
    ],
    answer:
      'Yes, and Ensaar starts smaller than most. Your team begins as a pod of three to fifteen people employed through our Employer of Record, working only for you, with no entity or lease required. Ensaar handles hiring, employment, payroll, equipment, and India-side operations. When headcount makes your own subsidiary cheaper, we incorporate it and move the team across with service continuity intact.',
    cta: 'contact',
  },
  {
    id: 'in-entity',
    question: 'Do we need our own Indian entity, and when is it worth it?',
    keywords: [
      'entity', 'subsidiary', 'incorporate', 'incorporation', 'register a company', 'private limited',
      'wholly owned', 'fdi', 'fc-gpr', 'rbi', 'transfer pricing', 'safe harbour', 'safe harbor',
      'when to convert',
    ],
    answer:
      'Not to start, and usually not until past roughly twenty to thirty people, below which per-person fees cost less than running an Indian company. When you do convert, a foreign parent can own 100% under the automatic FDI route in most sectors, incorporation takes seven to ten working days with clean documents, and you need two directors with one resident in India. A captive is paid cost-plus, and Budget 2026 set a uniform 15.5% safe harbour margin for IT and ITeS.',
    cta: 'contact',
  },
  {
    id: 'in-speed',
    question: 'How fast can we get someone working in India?',
    keywords: [
      'how fast', 'how long', 'timeline', 'onboarding', 'start date', 'quickly', 'speed', 'notice period',
      'recruitment', 'recruit', 'hiring fee', 'replacement',
    ],
    answer:
      'Five to ten working days from having the candidate details and documents, sometimes faster. If Ensaar is also finding the person, recruitment comes first and is charged at 8.33% of annual salary, which is one month, payable when they join, with a 90-day replacement guarantee.',
    cta: 'contact',
  },
  {
    id: 'in-ip',
    question: 'Who owns the IP and the work product?',
    keywords: ['ip', 'intellectual property', 'ownership', 'own the work', 'confidentiality', 'nda', 'source code'],
    answer:
      'You do. IP assignment and confidentiality sit in the employment contract Ensaar issues to the employee and in the service agreement between Ensaar and you, so the rights land with you rather than with the employer of record.',
    cta: 'contact',
  },
  {
    id: 'in-jobs',
    question: 'Are you hiring, and how do I apply for a job?',
    keywords: [
      'job', 'jobs', 'hiring', 'vacancy', 'vacancies', 'opening', 'openings', 'apply', 'application',
      'career', 'careers', 'resume', 'cv', 'candidate', 'recruit me', 'work at ensaar', 'placement',
      'fresher', 'interview',
    ],
    answer:
      'Ensaar hires in India for client companies abroad, so roles appear when a client needs them rather than sitting on a permanent vacancy list. Register on the careers page and we will contact you when something matches your work. Ensaar never charges a candidate a fee of any kind.',
    cta: 'contact',
  },
  {
    id: 'co-what',
    question: 'What does Ensaar do?',
    keywords: [
      'what does ensaar do', 'about ensaar', 'services', 'offerings', 'what do you do', 'company',
      'ensaar', 'help with',
    ],
    answer:
      'Ensaar helps companies outside India build teams inside it. We employ people in India for you as Employer of Record, grow those teams into your own capability centre when the scale justifies it, and build software and practical AI capability with the same people. Ensaar has operated from Hyderabad and Noida since 2014.',
    cta: 'contact',
  },
];

// DailyByte product and signup entries, grounded in the site's own copy.
const DAILYBYTE_ENTRIES: KnowledgeEntry[] = [
  {
    id: 'db-what',
    question: 'What is DailyByte?',
    keywords: ['dailybyte', 'daily byte', 'platform', 'product'],
    answer:
      'DailyByte is Ensaar\'s practical AI enablement platform for individuals and enterprises. You learn to do real work by directing an AI assistant, and your process and outcome are both evaluated. Its three core features are AI Learn, AI Jobs, and Daily Code.',
    cta: 'individual',
  },
  {
    id: 'db-ai-learn',
    question: 'What is AI Learn?',
    keywords: ['ai learn', 'learn', 'labs', 'lab', 'guided practice', 'workspace'],
    answer:
      'AI Learn turns real work into guided labs. You pick a role-relevant lab, direct the AI with tools inside the workspace, submit an artifact, and get feedback on both how you used AI and whether the result was correct.',
    cta: 'individual',
  },
  {
    id: 'db-ai-jobs',
    question: 'What is AI Jobs?',
    // "ai target" stays as a legacy alias: the feature was renamed, and anyone
    // who remembers the old name should still land on this answer.
    keywords: ['ai jobs', 'jobs', 'ai target', 'target', 'job description', 'jd', 'job', 'role', 'readiness'],
    answer:
      'AI Jobs turns a job description into an interactive learning path. You save a job, and DailyByte builds skill modules, practice loops, Daily Code paths, and proof artifacts aligned to that role.',
    cta: 'individual',
  },
  {
    id: 'db-daily-code',
    question: 'What is Daily Code?',
    keywords: ['daily code', 'dailycode', 'sql', 'python', 'java', 'typescript', 'streams', 'stream', 'practice'],
    answer:
      'Daily Code keeps your fundamentals moving with one task each day in a stream you choose, such as SQL, Python, Java, TypeScript, or role-specific AI work missions. You can change streams as your target role changes.',
    cta: 'individual',
  },
  {
    id: 'db-who',
    question: 'Who is DailyByte for?',
    keywords: ['who is it for', 'audience', 'students', 'engineers', 'professionals', 'career', 'switcher', 'beginner'],
    answer:
      'DailyByte is for students and recent graduates, software engineers, data, product, QA, and operations professionals, career switchers, and enterprise or campus teams that want measurable, practical AI capability.',
    cta: 'individual',
  },
  {
    id: 'db-signup-individual',
    question: 'How do I sign up as an individual?',
    keywords: ['sign up', 'signup', 'register', 'registration', 'create account', 'join', 'get started', 'start', 'individual', 'myself', 'personal'],
    answer:
      'You can create a personal DailyByte account and start with AI Learn right away. Use the button below to open individual registration.',
    cta: 'individual',
  },
  {
    id: 'db-signup-enterprise',
    question: 'How does my company or campus get started?',
    keywords: ['enterprise', 'company', 'organization', 'organisation', 'team', 'teams', 'campus', 'college', 'university', 'cohort', 'business', 'employees', 'staff', 'workforce'],
    answer:
      'For a team, company, or campus, DailyByte supports a shared workspace and cohort rollout around AI Learn, AI Jobs, and Daily Code, with capability reporting. Use the button below to open enterprise signup.',
    cta: 'enterprise',
  },
  {
    id: 'db-pricing',
    question: 'How much does DailyByte cost?',
    keywords: ['price', 'pricing', 'cost', 'plans', 'plan', 'fee', 'subscription', 'free', 'trial'],
    answer:
      'DailyByte has individual and team plans. You can review the current plans and what each includes on the DailyByte plans page.',
    cta: 'pricing',
  },
  {
    id: 'co-contact',
    question: 'How do I contact Ensaar or what is your email?',
    keywords: ['contact', 'email', 'reach', 'reach out', 'get in touch', 'phone', 'call', 'support', 'talk to', 'speak to', 'enquiry', 'inquiry'],
    answer:
      'You can reach Ensaar at support@ensaar.com for AI, software, managed engineering, and BCEP enquiries. Office hours are Monday through Friday, 9am to 5pm IST, with Saturdays by appointment. Ensaar has locations in Hyderabad and Noida.',
    cta: 'contact',
  },
  {
    id: 'co-bcep',
    question: 'What is BCEP?',
    keywords: ['bcep', 'business communication', 'certification', 'certificate', 'training', 'course', 'courses', 'leadership', 'professional excellence', 'facilitator'],
    answer:
      'BCEP is Ensaar\'s Business Communication Excellence Program. AI readiness and emotional intelligence are core across its Leadership Execution, Business Communication, Professional Excellence, and Enterprise Facilitation pathways. Participants complete structured learning, workplace application, and an assessed demonstration before certification. For enquiries, email support@ensaar.com.',
    cta: 'contact',
  },
  {
    id: 'db-measure',
    question: 'How does DailyByte measure AI capability?',
    keywords: ['measure', 'evaluate', 'evaluation', 'assessment', 'score', 'proof', 'evidence', 'judge', 'grading'],
    answer:
      'DailyByte evaluates whether a person can understand a brief, direct AI effectively, inspect source material, verify important claims, improve weak output, and submit useful proof. That produces separate signals for process, outcome, role readiness, and practical judgment.',
    cta: 'individual',
  },
];

// Pull distinctive acronyms (BCEP, RAG, LLM, SQL, ...) out of an entry so a
// one-word question like "what is BCEP" can still match it.
function deriveAcronyms(text: string): string[] {
  const found = text.match(/\b[A-Z][A-Za-z0-9]*[A-Z0-9]\b/g) || [];
  return Array.from(new Set(found.map((token) => token.toLowerCase()))).filter((token) => token.length >= 2);
}

// Website and company entries, reused from the site FAQ so answers stay in sync.
const FAQ_ENTRIES: KnowledgeEntry[] = FAQ.map((item, index) => ({
  id: `faq-${index}`,
  question: item.question,
  keywords: deriveAcronyms(`${item.question} ${item.answer}`),
  answer: item.answer,
  cta:
    item.category === 'bcep' || item.category === 'engagement' || item.category === 'india'
      ? 'contact'
      : null,
}));

export const KNOWLEDGE: KnowledgeEntry[] = [...INDIA_ENTRIES, ...DAILYBYTE_ENTRIES, ...FAQ_ENTRIES];

// --- Profanity filter -------------------------------------------------------
// A small, word-boundary matched blocklist. The goal is to keep the assistant
// civil, not to build an exhaustive filter. Matching is on whole words so benign
// words that merely contain these substrings are not flagged.
const PROFANITY = [
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cunt', 'slut', 'whore',
  'nigger', 'nigga', 'faggot', 'retard', 'motherfucker', 'wanker', 'bollocks', 'prick',
];

export function containsProfanity(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ') // strip punctuation and simple leetspeak separators
    .split(/\s+/);
  const words = new Set(normalized);
  return PROFANITY.some((bad) => words.has(bad));
}

// --- Retrieval --------------------------------------------------------------
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'did', 'can', 'could', 'would', 'should',
  'i', 'you', 'we', 'they', 'it', 'my', 'our', 'your', 'to', 'of', 'for', 'in', 'on',
  'and', 'or', 'with', 'about', 'how', 'what', 'when', 'where', 'why', 'who', 'me', 'us',
  'this', 'that', 'be', 'have', 'has', 'get', 'want', 'need', 'am', 'as', 'at', 'by', 'from',
  'tell', 'know', 'like', 'please', 'there', 'their', 'if', 'so', 'will', 'more', 'any',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

export type AnswerResult =
  | { kind: 'answer'; entry: KnowledgeEntry }
  | { kind: 'profanity' }
  | { kind: 'empty' }
  | { kind: 'unknown' };

/**
 * Match a free-text question to the single best knowledge entry. Returns
 * `unknown` when nothing clears the confidence bar, so the caller can route the
 * person to the contact form instead of guessing.
 */
const SIGNUP_RE = /\b(sign\s?up|signup|signing up|register|registration|create (an? )?account|get(ting)? started|how (do|can) i (start|begin|join)|join|onboard|enrol|enroll)\b/;
const ORG_RE = /\b(compan(y|ies)|organi[sz]ations?|enterprises?|corporate|teams?|campus(es)?|colleges?|universit(y|ies)|cohorts?|employees?|staff|workforce|businesses?|institutions?|our (team|company|org|organi[sz]ation))\b/;

const ENTRY_BY_ID = new Map(KNOWLEDGE.map((entry) => [entry.id, entry]));

export function answerQuestion(query: string): AnswerResult {
  const trimmed = query.trim();
  if (!trimmed) return { kind: 'empty' };
  if (containsProfanity(trimmed)) return { kind: 'profanity' };

  // Deterministic routing for signup intent: organizations go to enterprise
  // signup, everyone else to individual signup. This guarantees the assistant
  // never funnels a would-be signup into the contact form.
  const lower = trimmed.toLowerCase();
  if (SIGNUP_RE.test(lower)) {
    const target = ORG_RE.test(lower) ? 'db-signup-enterprise' : 'db-signup-individual';
    const entry = ENTRY_BY_ID.get(target);
    if (entry) return { kind: 'answer', entry };
  }

  const queryTokens = tokenize(trimmed);
  if (queryTokens.length === 0) return { kind: 'unknown' };
  const querySet = new Set(queryTokens);

  let best: KnowledgeEntry | null = null;
  let bestScore = 0;
  let bestMatched = 0;
  let bestStrong = 0;

  for (const entry of KNOWLEDGE) {
    const questionTokens = new Set(tokenize(entry.question));
    const keywordText = entry.keywords.join(' ');
    const keywordTokens = new Set([...tokenize(keywordText), ...entry.keywords.map((k) => k.toLowerCase())]);
    const answerTokens = new Set(tokenize(entry.answer));

    // Multi-word keyword phrases (e.g. "ai target", "sign up") are strong signals.
    let phraseBonus = 0;
    const lowerQuery = trimmed.toLowerCase();
    for (const keyword of entry.keywords) {
      if (keyword.includes(' ') && lowerQuery.includes(keyword.toLowerCase())) phraseBonus += 4;
    }
    if (entry.question && lowerQuery.includes(entry.question.toLowerCase().replace(/[?]/g, ''))) phraseBonus += 6;

    // A "strong" hit is a match on the entry's keywords or its own question
    // words (topical), as opposed to an incidental word that only appears in the
    // answer prose.
    let score = phraseBonus;
    let matched = 0;
    let strong = phraseBonus > 0 ? 1 : 0;
    for (const token of querySet) {
      if (keywordTokens.has(token)) {
        score += 3;
        matched += 1;
        strong += 1;
      } else if (questionTokens.has(token)) {
        score += 3;
        matched += 1;
        strong += 1;
      } else if (answerTokens.has(token)) {
        score += 1;
        matched += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = entry;
      bestMatched = matched;
      bestStrong = strong;
    }
  }

  // Confidence bar: answer only when the query lands a real topical signal (a
  // keyword, the entry's own question terms, or a matched phrase). Every stored
  // answer is human written, so a topical match is always accurate; a query with
  // no strong hit is handed to the contact form instead of guessed at.
  const confident = best !== null && bestStrong >= 1 && bestScore >= 3;
  if (!confident || !best) return { kind: 'unknown' };
  return { kind: 'answer', entry: best };
}
