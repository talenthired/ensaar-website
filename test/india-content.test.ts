import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sitemap from '../app/sitemap';
import { SERVICES } from '../lib/content/services';
import { EOR_FAQ, GCC_FAQ, FAQ } from '../lib/content/faq';
import { answerQuestion } from '../lib/content/knowledge';
import { EOR_PRICE_USD, RECRUITMENT_FEE_PERCENT } from '../lib/content/india';
import { buildLlmsTxt } from '../lib/content/llms';

/**
 * The India services span a service array, two pages, the FAQ, the assistant's
 * knowledge base, the nav, the footer, the sitemap, and llms.txt. Nothing in
 * this repo previously failed when one of those drifted from the others, and a
 * price quoted three different ways is the failure a buyer notices first.
 */

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const INDIA_SLUGS = ['employer-of-record', 'gcc'];

describe('India services are wired into every route list', () => {
  it('exist in the service catalogue', () => {
    for (const slug of INDIA_SLUGS) {
      expect(SERVICES.some((service) => service.slug === slug), `${slug} missing from SERVICES`).toBe(true);
    }
  });

  it('have a page on disk', () => {
    for (const slug of INDIA_SLUGS) {
      expect(() => read(`app/services/${slug}/page.tsx`)).not.toThrow();
    }
  });

  it('are in the sitemap', () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const slug of INDIA_SLUGS) {
      expect(urls, `${slug} missing from sitemap`).toContain(`https://ensaar.com/services/${slug}`);
    }
  });

  it('are reachable from the header and the footer', () => {
    const header = read('components/layout/Header.tsx');
    const footer = read('components/layout/Footer.tsx');
    for (const slug of INDIA_SLUGS) {
      expect(header, `${slug} missing from header nav`).toContain(`/services/${slug}`);
      expect(footer, `${slug} missing from footer`).toContain(`/services/${slug}`);
    }
  });

  it('keep careers and the cookie notice reachable and indexed', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain('https://ensaar.com/careers');
    expect(urls).toContain('https://ensaar.com/legal/cookies');
    expect(read('components/layout/Header.tsx'), 'careers missing from header').toContain("href: '/careers'");
    expect(read('components/layout/Footer.tsx'), 'careers missing from footer').toContain("href: '/careers'");
    expect(read('components/layout/Footer.tsx'), 'cookie notice missing from footer').toContain('/legal/cookies');
    // The header nav is hand-written, so a page can vanish from it in an edit.
    for (const href of ['/', '/about', '/services', '/insights', '/events', '/careers', '/contact']) {
      expect(read('components/layout/Header.tsx'), `${href} missing from header nav`).toContain(`href: '${href}'`);
    }
  });

  it('render on /faq, because that page lists categories by hand', () => {
    const page = read('app/faq/page.tsx');
    for (const category of new Set(FAQ.map((item) => item.category))) {
      expect(page, `FAQ category "${category}" is missing from the /faq category list`).toContain(`key: '${category}'`);
    }
  });

  it('are described in llms.txt', () => {
    const llms = buildLlmsTxt();
    for (const slug of INDIA_SLUGS) {
      expect(llms).toContain(`/services/${slug}`);
    }
    expect(llms).toContain(`$${EOR_PRICE_USD}`);
  });
});

describe('shared surfaces name the India services, not only AI', () => {
  // These are the strings that describe the whole company rather than one page.
  // Each one was AI-only before the repositioning, and each is easy to miss.
  const SURFACES: Array<[string, string, RegExp]> = [
    ['social card default', 'app/og/route.tsx', /Employer of Record/i],
    ['contact page metadata', 'app/contact/page.tsx', /Employer of Record/i],
    ['insights index', 'app/insights/page.tsx', /India/i],
    ['RSS channel', 'app/insights/feed.xml/route.ts', /India/i],
    ['terms scope', 'app/legal/terms/page.tsx', /Employer of Record/i],
    ['refund policy', 'app/legal/refund-policy/page.tsx', /Employer of Record/i],
    ['privacy scope', 'app/legal/privacy/page.tsx', /Employer of Record/i],
    ['live chat categories', 'components/marketing/EnsaarLiveSupport.tsx', /india-hiring/],
  ];

  for (const [name, file, pattern] of SURFACES) {
    it(`${name} mentions the India services`, () => {
      expect(read(file)).toMatch(pattern);
    });
  }

  it('the llms.txt entity block leads with the India services', () => {
    expect(buildLlmsTxt()).toMatch(/Primary category: Employer of Record/);
  });
});

describe('the published price is quoted the same way everywhere', () => {
  it('never states a per-employee monthly fee other than the constant', () => {
    const sources = [
      ...FAQ.map((item) => item.answer),
      read('app/services/employer-of-record/page.tsx'),
      read('app/services/gcc/page.tsx'),
      read('lib/content/knowledge.ts'),
      buildLlmsTxt(),
    ];
    // Any "$NNN per employee/person per month" in the codebase must be the
    // published figure. A stray $249 left in one page is the bug this catches.
    const pattern = /\$(\d+)\s*per\s*(employee|person)/gi;
    for (const source of sources) {
      for (const match of source.matchAll(pattern)) {
        expect(Number(match[1]), `found $${match[1]} per employee, expected $${EOR_PRICE_USD}`).toBe(EOR_PRICE_USD);
      }
    }
  });

  it('quotes the recruitment fee consistently', () => {
    const answer = GCC_FAQ.find((item) => item.question.includes('What does Ensaar charge'))!;
    expect(answer.answer).toContain(`${RECRUITMENT_FEE_PERCENT}%`);
  });
});

describe('EnAI answers India questions instead of deferring to the contact form', () => {
  // Phrased the way a buyer types, not the way the entries are written.
  const QUESTIONS = [
    'can you hire someone for us in india',
    'what is an employer of record',
    'how much does EOR cost',
    'do we need an entity to hire in india',
    'what is PF and ESI',
    'what are the statutory costs of employing in india',
    'permanent establishment risk',
    'can you set up a GCC',
    'we want to build a capability center in india',
    'how long does it take to hire in india',
    'who owns the IP',
    'what does ensaar do',
  ];

  for (const question of QUESTIONS) {
    it(`answers: ${question}`, () => {
      const result = answerQuestion(question);
      expect(result.kind, `"${question}" fell through to ${result.kind}`).toBe('answer');
    });
  }

  it('routes EOR pricing to the EOR price entry, not the DailyByte plans entry', () => {
    const result = answerQuestion('how much do you charge per employee per month in india');
    expect(result.kind).toBe('answer');
    if (result.kind !== 'answer') return;
    expect(result.entry.answer).toContain(`$${EOR_PRICE_USD}`);
  });

  it('still answers the DailyByte questions it answered before', () => {
    for (const question of ['what is dailybyte', 'what is AI Learn', 'how do I sign up']) {
      expect(answerQuestion(question).kind, question).toBe('answer');
    }
  });

  it('keeps every India FAQ answer non-empty and specific', () => {
    for (const item of [...EOR_FAQ, ...GCC_FAQ]) {
      expect(item.answer.length, item.question).toBeGreaterThan(80);
      expect(item.category).toBe('india');
    }
  });
});
