import { describe, expect, it } from 'vitest';
import { agreementToText, buildMasterAgreement } from '@/lib/eor/agreement';
import {
  PROVIDENT_FUND_TERMS,
  buildEmploymentAgreement,
  buildOfferLetter,
  renderEmploymentDocumentHtml,
  salaryBreakup,
  type EmploymentDocument,
} from '@/lib/eor/employment-docs';

const input = {
  employee: { employeeName: 'Anita Rao', employeeEmail: 'anita@example.com', jobTitle: 'Senior Engineer', salaryInr: 2_400_000, startDate: '2026-11-02', workState: 'Karnataka' },
  customerName: 'Pristinno Tech Inc.',
  issuedOn: '2026-10-01',
  signatory: { name: 'Rahul Gudipudi', title: 'Authorised Signatory' },
  reference: 'ENS-ABCD1234',
};

/** Every word a document would print, for searching. */
const allText = (doc: EmploymentDocument) =>
  [
    doc.title,
    ...doc.preamble,
    ...[...doc.sections, ...doc.annexures.flatMap((a) => a.sections)].flatMap((s) => [s.heading ?? '', ...s.paragraphs, ...(s.list ?? []), ...(s.table ? s.table.rows.flat().concat(s.table.foot ?? []) : [])]),
    ...doc.annexures.map((a) => a.title),
    ...doc.signatures.flatMap((s) => [s.party, ...s.lines]),
  ].join('\n');

describe('salary breakup', () => {
  it('splits the gross into basic (half), HRA (half of basic) and a special allowance that make it up exactly', () => {
    const { lines, gross } = salaryBreakup(2_400_000);
    expect(lines.map((l) => [l.label, l.annual])).toEqual([
      ['Basic pay', 1_200_000],
      ['House rent allowance', 600_000],
      ['Special allowance', 600_000],
    ]);
    expect(lines.reduce((n, l) => n + l.annual, 0)).toBe(gross.annual);
    expect(gross.monthly).toBe(200_000);
  });

  it('still adds up exactly for an amount that does not divide evenly', () => {
    const { lines, gross } = salaryBreakup(1_234_567);
    expect(lines.reduce((n, l) => n + l.annual, 0)).toBe(1_234_567);
    expect(gross.annual).toBe(1_234_567);
  });
});

describe('offer letter', () => {
  const doc = buildOfferLetter(input);
  const text = allText(doc);

  it('names the role, start date, client, place of work, salary, probation and notice', () => {
    expect(text).toContain('as Senior Engineer, starting on November 2, 2026');
    expect(text).toContain('Ensaar\'s client, Pristinno Tech Inc. (the "Client")');
    expect(text).toContain('Ensaar is your employer');
    expect(text).toContain('Your place of work is Karnataka, India');
    expect(text).toContain('Your annual gross salary is ₹24,00,000');
    expect(text).toContain('probation for the first 3 months');
    expect(text).toContain("30 days' written notice");
  });

  it('carries the salary table in Annexure 1, and acceptance by a date', () => {
    const annex = doc.annexures[0]!;
    expect(annex.title).toBe('Annexure 1: Salary');
    expect(annex.sections[0]!.table!.foot).toEqual(['Gross salary', '₹2,00,000', '₹24,00,000']);
    expect(text).toContain('by October 6, 2026');
  });

  it('is signed for Ensaar by the person issuing it, with an acceptance block', () => {
    expect(doc.signatures[0]!.lines.slice(0, 2)).toEqual(['Rahul Gudipudi', 'Authorised Signatory']);
    expect(doc.signatures[1]!.party).toBe('Accepted by the employee');
  });
});

describe('employment agreement', () => {
  const doc = buildEmploymentAgreement(input);
  const text = allText(doc);

  it('makes the Client the director of work but never the employer', () => {
    expect(text).toContain('You will work on assignments for Pristinno Tech Inc. (the "Client")');
    expect(text).toContain('The Client is not your employer and cannot vary your terms; only Ensaar can.');
  });

  it('pays by the 7th, settles within two working days, and dismisses only after a fair hearing', () => {
    expect(text).toContain('no later than the 7th day of the following month');
    expect(text).toContain('within two working days of your last working day');
    expect(text).toContain('giving you a fair chance to respond');
  });

  it('assigns the work to Ensaar for onward assignment to the Client', () => {
    expect(text).toContain('belongs to Ensaar from the moment it is created, for onward assignment to the Client');
  });

  it('has no non-compete after employment, which Indian law would not enforce', () => {
    expect(text).toContain('Nothing in this agreement stops you working for anyone you choose after your employment ends.');
    expect(text).not.toMatch(/not (to )?compete/i);
    expect(text).toContain('if the Client arranges your transfer');
  });
});

describe('provident fund is discretionary everywhere', () => {
  const documents = [allText(buildOfferLetter(input)), allText(buildEmploymentAgreement(input)), agreementToText(buildMasterAgreement('Pristinno Tech', null))];

  it('both employee documents carry the discretionary wording', () => {
    for (const text of documents.slice(0, 2)) {
      expect(text).toContain(PROVIDENT_FUND_TERMS);
      expect(text).toContain('Ensaar may introduce provident fund at its discretion');
    }
  });

  it('the client agreement says provident fund is not currently part of the terms, and when it would start', () => {
    const master = documents[2]!;
    expect(master).toContain('Provident fund is not currently part of Ensaar\'s employment terms');
    expect(master).toContain('Ensaar may offer provident fund at its discretion');
    expect(master).toContain('provident fund from the date Ensaar offers it or the law requires it');
  });

  it('nothing promises a provident fund contribution as if it were already made', () => {
    for (const text of documents) {
      expect(text).not.toMatch(/deduct, file and pay provident fund/i);
      expect(text).not.toMatch(/Employer PF/i);
      expect(text).not.toMatch(/including provident fund,/i);
    }
  });
});

describe('the client agreement covers what the review found missing', () => {
  const text = agreementToText(buildMasterAgreement('Pristinno Tech', null));

  it.each([
    ['right to work, no visa support', 'Ensaar employs only individuals who already have the right to work in India'],
    ['changes only by Schedule A', 'takes effect only through a new or amended Schedule A signed by both parties'],
    ['work product disclaimer', 'is not responsible for the quality, timeliness or fitness for purpose of their work product'],
    ['payroll inputs cut-off', 'by the 10th of each month, about anything that changes that month\'s pay'],
    ['prior engagement disclosed', 'any previous or current engagement it has with that individual'],
    ['direct promises', 'Any promise the Customer makes directly to an Employee'],
    ['know-your-business', 'will complete Ensaar\'s know-your-business checks'],
    ['collection costs', 'reasonable costs of recovering any overdue amount, including legal fees'],
    ['invoice disputes', 'disputes part of an invoice in good faith'],
    ['confidentiality exceptions', 'Confidential information does not include information that is or becomes public'],
    ['injunctive relief', 'may seek an injunction or other urgent relief'],
    ['data authority', 'the Customer confirms that it is entitled to do so'],
    ['insolvency', 'becomes insolvent, enters liquidation or administration'],
    ['what happens to employees at the end', 'the arrangement for every Employee ends with it'],
    ['survival', 'survive it'],
    ['indemnity procedure', 'A party seeking an indemnity will tell the other promptly in writing'],
    ['notices', 'Notices under this agreement are given in writing by email'],
    ['force majeure', 'events beyond its reasonable control'],
    ['no joint employment', 'the Customer is not the employer of any Employee'],
    ['assignment and staff non-solicitation', 'The Customer may not transfer this agreement without Ensaar\'s written consent'],
    ['severability', 'If any part of this agreement is held unenforceable'],
  ])('%s', (_, phrase) => {
    expect(text).toContain(phrase);
  });
});

describe('rendering', () => {
  it('escapes everything that came from data, and loads no script', () => {
    const doc = buildOfferLetter({ ...input, customerName: '<script>alert(1)</script> & Co', employee: { ...input.employee, employeeName: 'Ann "Quote" <b>' } });
    const html = renderEmploymentDocumentHtml(doc, { logoUrl: '/ensaar-logo.png', generatedNote: 'Draft.' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co');
    expect(html).toContain('Ann &quot;Quote&quot; &lt;b&gt;');
    expect(html).toContain('<img src="/ensaar-logo.png"');
    expect(html).toContain('@page { size: A4');
  });
});

describe('the greeting', () => {
  it('greets by the given name when set, and keeps the legal name everywhere else', async () => {
    const { buildOfferLetter, employmentDocToText } = await import('@/lib/eor/employment-docs');
    const doc = buildOfferLetter({
      employee: { employeeName: 'Pulla Lakshmi', givenName: 'Lakshmi', employeeEmail: 'l@example.com', jobTitle: 'Lead Recruiter', salaryInr: 1_600_000, startDate: '2026-10-01', workState: 'Telangana' },
      customerName: 'Pristinno Technology LLC',
      issuedOn: '2026-10-02',
      signatory: { name: 'Shanimole', title: 'Managing Director' },
      reference: 'ENS-TEST',
    });
    const text = employmentDocToText(doc);
    expect(text).toContain('Dear Lakshmi,');
    expect(text).not.toContain('Leena');
    expect(text).not.toContain('Dear Pulla');
    expect(text).toContain('To: Pulla Lakshmi <l@example.com>');
    const plain = buildOfferLetter({ employee: { employeeName: 'Anita Rao', employeeEmail: null, jobTitle: 'Engineer', salaryInr: 2_400_000, startDate: '2026-11-02', workState: 'Karnataka' }, customerName: 'X', issuedOn: '2026-10-02', signatory: { name: 'S', title: 'MD' }, reference: 'R' });
    expect(employmentDocToText(plain)).toContain('Dear Anita,');
  });
});
