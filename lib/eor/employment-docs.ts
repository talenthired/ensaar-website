import { siteConfig } from '@/lib/utils';
import { ENSAAR_ADDRESS, ENSAAR_PARTY, NOTICE_DAYS, PROBATION_MONTHS } from './agreement';
import { formatDay, formatInr, knownAs, type EmployeeInput } from './onboarding';
import { salaryBreakup } from './salary';
import { estimateTax } from './tax';

export { BASIC_SHARE, HRA_SHARE_OF_BASIC, salaryBreakup, type SalaryLine } from './salary';

/**
 * The two documents Ensaar issues to each employee: the offer letter and the
 * employment agreement. Pure and deterministic, like the client agreement, so
 * the text can be tested and regenerated exactly.
 *
 * Written for an Indian employer that places people with a client abroad:
 *   - the Client directs the work but is not the employer;
 *   - provident fund is NOT currently offered (the EPF Act does not yet apply
 *     to Ensaar), so it is described as discretionary everywhere, with the
 *     promise to register once the law requires it;
 *   - there is no post-employment non-compete: section 27 of the Contract Act
 *     makes one void in India, so restrictions after employment are limited to
 *     confidentiality and non-solicitation, to the extent the law allows;
 *   - leave, hours and notice defer to the state Shops and Establishments Act,
 *     which differs by state, rather than quoting figures that could fall short.
 *
 * Neither document has had legal review yet: see the note on each page.
 */

/** Days the candidate has to accept, counted from the letter's date. */
export const OFFER_VALID_DAYS = 5;
/** Salary for a month is paid by this day of the following month, as the Code on Wages requires. */
export const SALARY_PAY_DAY = 7;
/** Months after employment during which the non-solicitation promises apply. */
export const NON_SOLICIT_MONTHS = 12;

export type DocTable = { columns: string[]; rows: string[][]; foot?: string[] };
export type DocSection = { heading?: string; paragraphs: string[]; table?: DocTable; list?: string[] };
export type EmploymentDocument = {
  kind: 'offer' | 'agreement';
  title: string;
  reference: string;
  issuedOn: string;
  /** Lines above the body: date, addressee, subject. */
  preamble: string[];
  sections: DocSection[];
  annexures: Array<{ title: string; sections: DocSection[] }>;
  signatures: Array<{ party: string; lines: string[] }>;
};

export type EmploymentDocInput = {
  employee: Pick<EmployeeInput, 'employeeName' | 'employeeEmail' | 'jobTitle' | 'salaryInr' | 'startDate' | 'workState'> & { givenName?: string | null };
  /** The client the employee works for. */
  customerName: string;
  /** YYYY-MM-DD, the date on the document. */
  issuedOn: string;
  /** Who signs for Ensaar. */
  signatory: { name: string; title: string };
  /** A short reference printed on the document, e.g. the employee's id. */
  reference: string;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const addDays = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const inr = (n: number) => formatInr(n);

/** The provident fund position, in the words the employee reads. Used in both documents. */
export const PROVIDENT_FUND_TERMS =
  'Ensaar does not currently operate a provident fund for its employees, because the Employees\' Provident Funds and Miscellaneous Provisions Act does not yet apply to it. Ensaar may introduce provident fund at its discretion, and will register and contribute from the date the law requires it to. If provident fund is introduced, the employee contribution the law sets will be deducted from your salary, and Ensaar will pay the employer contribution in addition to your gross salary.';

const statutoryBenefits = (): string[] => [
  PROVIDENT_FUND_TERMS,
  'Gratuity is paid in line with the Payment of Gratuity Act (or the provision that replaces it) where it applies to Ensaar and to your service.',
  'Employees\' state insurance applies where your pay and Ensaar\'s headcount bring you within the scheme, and statutory bonus applies where the Payment of Bonus Act covers your salary. Where they apply, Ensaar makes the contributions and deductions the law requires.',
  'Maternity benefit is available as the Maternity Benefit Act provides, including up to 26 weeks of paid leave where you qualify.',
];

const salaryTable = (salaryInr: number): DocTable => {
  const { lines, gross } = salaryBreakup(salaryInr);
  return {
    columns: ['Component', 'Monthly', 'Annual'],
    rows: lines.map((l) => [l.label, inr(l.monthly), inr(l.annual)]),
    foot: [gross.label, inr(gross.monthly), inr(gross.annual)],
  };
};

/**
 * Estimated monthly take-home under the new tax regime, which applies unless
 * the employee chooses the old regime in the portal.
 */
function takeHomeSection(salaryInr: number, workState: string): DocSection {
  const t = estimateTax({ annualGross: salaryInr, workState, regime: 'new' });
  return {
    heading: 'Estimated monthly take-home (new tax regime)',
    paragraphs: [
      `Estimated for tax year ${t.taxYear} under the new tax regime, which applies unless you choose the old regime in the Ensaar employee portal and declare your investments there. Your actual tax depends on your declarations and any other income.`,
    ],
    table: {
      columns: ['', 'Monthly'],
      rows: [
        ['Gross salary', inr(Math.round(salaryInr / 12))],
        ['Income tax (TDS), estimated', `- ${inr(t.monthlyTds)}`],
        ['Professional tax, estimated', `- ${inr(Math.round(t.professionalTax / 12))}`],
      ],
      foot: ['Estimated take-home', inr(t.monthlyTakeHome)],
    },
  };
}

/** The offer letter: what is offered, on what conditions, with the salary and benefits annexures. */
export function buildOfferLetter(input: EmploymentDocInput): EmploymentDocument {
  const { employee, customerName, issuedOn, signatory } = input;
  const acceptBy = addDays(issuedOn, OFFER_VALID_DAYS);
  return {
    kind: 'offer',
    title: 'Offer of employment',
    reference: input.reference,
    issuedOn,
    preamble: [`Date: ${formatDay(issuedOn)}`, `To: ${employee.employeeName}${employee.employeeEmail ? ` <${employee.employeeEmail}>` : ''}`, `Subject: Offer of employment as ${employee.jobTitle}`],
    sections: [
      {
        paragraphs: [
          // Their given name, which is not always the first word of the legal name (Lakshmi, for Pulla Lakshmi).
          `Dear ${employee.givenName?.trim() || firstName(employee.employeeName)},`,
          `We are pleased to offer you employment with ${ENSAAR_PARTY.legalName} ("Ensaar") as ${employee.jobTitle}, starting on ${formatDay(employee.startDate)}.`,
          `You will work full time on assignments for Ensaar's client, ${customerName} (the "Client"), which will direct your day-to-day work. Ensaar is your employer: your employment, your pay and your benefits are with Ensaar, not with the Client.`,
          `Your place of work is ${employee.workState}, India. Ensaar may ask you to work from another location in India, with reasonable notice.`,
          `Your annual gross salary is ${inr(employee.salaryInr)}, paid monthly, with the breakdown in Annexure 1. Your benefits are set out in Annexure 2.`,
          `You will be on probation for the first ${PROBATION_MONTHS} months. After probation, and during it, either you or Ensaar may end your employment by giving ${NOTICE_DAYS} days' written notice, or pay in place of notice, as your employment agreement sets out.`,
        ],
      },
      {
        heading: 'Conditions of this offer',
        paragraphs: ['This offer depends on:'],
        list: [
          'satisfactory background and reference checks;',
          'your giving Ensaar, before your start date, your PAN, proof of identity and address, educational certificates, your last payslip and relieving letter from any previous employer, and your bank details;',
          'your being free to take up this employment, with no notice period, restriction or obligation to anyone else that would prevent it; and',
          'your signing Ensaar\'s employment agreement on or before your start date. Your employment is governed by that agreement and by Ensaar\'s policies as they apply from time to time.',
        ],
      },
      {
        paragraphs: [
          `Please accept this offer by signing and returning a copy by ${formatDay(acceptBy)}. If we do not hear from you by then, or if you do not join on your start date (unless we agree another date in writing), the offer lapses. Ensaar may also withdraw it if information you have given proves to be incorrect.`,
          'Please keep the terms of this offer, and your pay in particular, confidential.',
          `This letter, its annexures and your employment agreement together set out the terms of your employment and replace anything discussed or written before. If you have any question, write to ${siteConfig.hrEmail}.`,
          'We look forward to welcoming you.',
        ],
      },
    ],
    annexures: [
      {
        title: 'Annexure 1: Salary',
        sections: [
          { paragraphs: ['All amounts are in Indian rupees, before deductions.'], table: salaryTable(employee.salaryInr) },
          {
            heading: 'Deductions',
            paragraphs: [
              'Income tax (TDS) is deducted as the Income-tax Act requires, based on the declarations you give Ensaar. Professional tax is deducted at the rate your state sets. Employees\' state insurance is deducted where it applies.',
              'Provident fund: not currently deducted. See Annexure 2.',
              'Monthly figures are rounded to the nearest rupee. Ensaar may change the split between components to keep it in line with the law, without reducing your gross salary.',
            ],
          },
          takeHomeSection(employee.salaryInr, employee.workState),
        ],
      },
      {
        title: 'Annexure 2: Benefits and policies',
        sections: [
          { heading: 'Statutory benefits', paragraphs: statutoryBenefits() },
          {
            heading: 'Working hours and leave',
            paragraphs: [
              'Your normal working week is five days, with daily hours set by the Client\'s needs and never beyond what the law of your state permits. Because the Client\'s team is outside India, your hours may be scheduled to overlap with theirs.',
              'You are entitled to paid leave and public holidays under Ensaar\'s leave policy, which is never less than the Shops and Establishments Act of your state requires.',
            ],
          },
          {
            heading: 'Other benefits',
            paragraphs: ['Any benefit not required by law, such as insurance or allowances, is offered at Ensaar\'s discretion and may be introduced, changed or withdrawn by notice to you.'],
          },
        ],
      },
    ],
    signatures: [
      { party: `For ${ENSAAR_PARTY.legalName}`, lines: [signatory.name || 'Name:', signatory.title, 'Signature:'] },
      {
        party: 'Accepted by the employee',
        lines: [`I have read and understood this offer and its annexures and accept it on these terms.`, `Name: ${employee.employeeName}`, 'Signature:', 'Date:'],
      },
    ],
  };
}

/** The employment agreement the employee signs on or before joining. */
export function buildEmploymentAgreement(input: EmploymentDocInput): EmploymentDocument {
  const { employee, customerName, issuedOn, signatory } = input;
  return {
    kind: 'agreement',
    title: 'Employment agreement',
    reference: input.reference,
    issuedOn,
    preamble: [
      `This agreement is dated ${formatDay(issuedOn)} and is between:`,
      `${ENSAAR_PARTY.legalName}, ${ENSAAR_PARTY.description} ("Ensaar", "we"), and`,
      `${employee.employeeName}, residing at the address recorded in Ensaar's onboarding records (the "Employee", "you").`,
    ],
    sections: [
      {
        heading: '1. Appointment',
        paragraphs: [
          `Ensaar employs you as ${employee.jobTitle}, full time, from ${formatDay(employee.startDate)} (your "Start Date"), on the terms of this agreement and of your offer letter, whose annexures form part of it.`,
          `Ensaar provides employees to its clients. You will work on assignments for ${customerName} (the "Client"), which will direct your day-to-day work and to which you will report for it. The Client is not your employer and cannot vary your terms; only Ensaar can. Ensaar may assign you to work for a different client, or on Ensaar's own work, with reasonable notice.`,
        ],
      },
      {
        heading: '2. Probation',
        paragraphs: [
          `Your first ${PROBATION_MONTHS} months are a probation period. Ensaar will confirm in writing when you have completed it. If Ensaar has a concern about your performance or conduct during probation, it will tell you, and either party may end your employment during probation as clause 13 allows.`,
        ],
      },
      {
        heading: '3. Place of work and hours',
        paragraphs: [
          `Your place of work is ${employee.workState}, India, from home or another place Ensaar approves. Ensaar may ask you to work from another location in India with reasonable notice. You will not work from outside India, even briefly, without Ensaar's written approval, because doing so can create tax and legal obligations for you, Ensaar and the Client.`,
          'Your normal working week is five days. Your hours are set by the Client\'s needs and may be scheduled to overlap with a team outside India, but never beyond what the law of your state permits. Where the law entitles you to overtime pay, Ensaar will pay it.',
        ],
      },
      {
        heading: '4. Duties and other work',
        paragraphs: [
          'You will do your work honestly, diligently and to the best of your ability, follow Ensaar\'s reasonable instructions and policies, and follow the Client\'s reasonable instructions and its policies on security, IT systems and workplace conduct.',
          'While you are employed by Ensaar you will not take up any other employment, consultancy or business, paid or unpaid, without Ensaar\'s written consent. You will tell Ensaar promptly about any interest or relationship that could conflict with your duties to Ensaar or the Client.',
        ],
      },
      {
        heading: '5. Pay',
        paragraphs: [
          `Your annual gross salary is ${inr(employee.salaryInr)}, split as set out in Annexure 1 of your offer letter. It is paid monthly in arrears into your bank account, no later than the ${SALARY_PAY_DAY}th day of the following month.`,
          'Ensaar deducts income tax, professional tax and any other amount the law requires. Ensaar may change the split between salary components to keep it in line with the law, without reducing your gross salary. Your pay is reviewed from time to time; any increase is at Ensaar\'s discretion.',
          'If Ensaar pays you more than is due, or you owe Ensaar money (for example an unreturned advance), Ensaar may recover it from your pay or final settlement, but only in the ways and to the extent the law permits.',
        ],
      },
      {
        heading: '6. Provident fund and other statutory benefits',
        paragraphs: statutoryBenefits(),
      },
      {
        heading: '7. Leave and holidays',
        paragraphs: [
          'You are entitled to paid leave and public holidays under Ensaar\'s leave policy, which is never less than the Shops and Establishments Act of your state requires. You will plan leave with the Client\'s team and apply for it in the way Ensaar\'s policy sets out. Leave not taken is carried forward or paid out only as the policy and the law provide.',
        ],
      },
      {
        heading: '8. Equipment and expenses',
        paragraphs: [
          'Equipment, accounts and access given to you by Ensaar or the Client remain their property. You will use them only for your work, keep them secure, follow their security rules, and return them when asked or when your employment ends.',
          'Ensaar reimburses reasonable business expenses that the Client or Ensaar approved in advance, against receipts.',
        ],
      },
      {
        heading: '9. Confidentiality',
        paragraphs: [
          'During and after your employment you will keep confidential, and use only for your work, all non-public information of Ensaar, the Client and their customers that you learn through your work, including source code, product plans, customer and employee data, prices and business information. You will not copy it to personal devices or accounts.',
          'This does not apply to information that is public through no fault of yours, or that you are required by law to disclose (in which case you will tell Ensaar first where the law allows). When your employment ends, or earlier on request, you will return or delete all such information and confirm in writing that you have done so.',
        ],
      },
      {
        heading: '10. Intellectual property',
        paragraphs: [
          'Everything you create in the course of your employment, alone or with others, including software, documents, designs, inventions and ideas (your "Work"), belongs to Ensaar from the moment it is created, for onward assignment to the Client. You assign to Ensaar all rights in your Work, worldwide and for their full term, and agree that Ensaar may assign them to the Client.',
          'To the extent the law allows, you will not assert moral rights in your Work against Ensaar, the Client or their successors. You will sign any document reasonably needed to record or protect these rights, during or after your employment, at Ensaar\'s cost.',
          'Anything you created before your Start Date, or create entirely in your own time without using Ensaar\'s or the Client\'s equipment or information and unrelated to their business, remains yours. If you want to use any of it in your work, tell Ensaar first.',
        ],
      },
      {
        heading: '11. Your personal data',
        paragraphs: [
          'Ensaar processes your personal data as your employer, under the Digital Personal Data Protection Act, 2023: to verify your identity and background, run payroll and tax, administer benefits and leave, manage your work and conduct, and meet its legal obligations. It shares only what is needed with the Client (to direct your work), with service providers bound to protect it (such as payroll, banking and verification providers), and with authorities where the law requires.',
          `Ensaar keeps your data for as long as the purpose and the law require. You may ask to see, correct or erase your data, or raise a grievance, by writing to ${siteConfig.hrEmail}. Ensaar and the Client may monitor the use of their systems and devices to keep them secure and to investigate misuse.`,
        ],
      },
      {
        heading: '12. Conduct',
        paragraphs: [
          'You will treat colleagues, the Client\'s staff and everyone you deal with respectfully. Ensaar does not tolerate harassment or discrimination, including sexual harassment: complaints can be raised under the Sexual Harassment of Women at Workplace Act with Ensaar\'s Internal Committee or, where Ensaar is not required to have one, the Local Committee for your district. You will not offer or accept any bribe or improper payment.',
        ],
      },
      {
        heading: '13. Ending your employment',
        paragraphs: [
          `Either you or Ensaar may end your employment by giving ${NOTICE_DAYS} days' written notice. Ensaar may instead pay you your salary for the notice period, or part of it, in place of notice, and may ask you not to work during the notice period while it continues to pay you. Ensaar may agree to release you before your notice ends.`,
          `Ensaar may end your employment without notice for serious misconduct, such as dishonesty, fraud, theft, violence, harassment, a serious breach of confidentiality or of the Client's security rules, or giving false information to get this job, but only after telling you what is alleged and giving you a fair chance to respond, as the law requires.`,
          'If the Client\'s need for your role ends, Ensaar will look for other work for you where it reasonably can; if there is none, Ensaar may end your employment with notice under this clause and any compensation the law requires.',
          'Before you leave you will hand over your work, and return all property, equipment and information of Ensaar and the Client. Ensaar will pay your final settlement within two working days of your last working day, as the law requires, and issue a relieving letter and certificate of experience.',
        ],
      },
      {
        heading: '14. After your employment',
        paragraphs: [
          `Nothing in this agreement stops you working for anyone you choose after your employment ends. For ${NON_SOLICIT_MONTHS} months after it ends, and to the extent the law allows, you will not use Ensaar's or the Client's confidential information to persuade any of their employees to leave, or to take business from them. This does not prevent you from being employed by the Client, or by a company it chooses, if the Client arranges your transfer.`,
        ],
      },
      {
        heading: '15. General',
        paragraphs: [
          'This agreement, with your offer letter and its annexures, is the whole agreement about your employment and replaces anything said or written before. It can be changed only in writing signed by Ensaar and you, except that Ensaar may update its policies from time to time and will tell you when it does.',
          'Notices may be given by email to the address each party has given the other. If any part of this agreement is held unenforceable, the rest continues in force. This agreement is governed by the laws of India and, subject to the jurisdiction of the authorities under Indian labour law, the courts at Hyderabad have jurisdiction over any dispute.',
          'Ensaar and you agree that this agreement may be signed electronically, and that an electronic signature has the same effect as a handwritten one under the Information Technology Act, 2000.',
        ],
      },
    ],
    annexures: [],
    signatures: [
      { party: `For ${ENSAAR_PARTY.legalName}`, lines: [signatory.name || 'Name:', signatory.title, 'Signature:', 'Date:'] },
      { party: 'The Employee', lines: [`Name: ${employee.employeeName}`, 'Signature:', 'Date:'] },
    ],
  };
}

/** The canonical plain text of a document: what is hashed at issue and attached to the signed copy. */
export function employmentDocToText(doc: EmploymentDocument): string {
  const section = (s: DocSection) => [
    ...(s.heading ? [s.heading] : []),
    ...s.paragraphs,
    ...(s.list ?? []).map((i) => `- ${i}`),
    ...(s.table ? [s.table.columns.join(' | '), ...s.table.rows.map((r) => r.join(' | ')), ...(s.table.foot ? [s.table.foot.join(' | ')] : [])] : []),
    '',
  ];
  return [
    doc.title.toUpperCase(),
    `Reference ${doc.reference}`,
    '',
    ...doc.preamble,
    '',
    ...doc.sections.flatMap(section),
    ...doc.signatures.flatMap((s) => [s.party, ...s.lines, '']),
    ...doc.annexures.flatMap((a) => [a.title.toUpperCase(), '', ...a.sections.flatMap(section)]),
  ].join('\n');
}

/** How an issued document was signed, shown in place of the blank signature lines. */
export type SignatureEvidence = {
  issuedBy: string;
  issuedAt: string;
  hash: string;
  signed: { name: string; email: string; at: string } | null;
};

// --- Rendering -------------------------------------------------------------------------------

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function sectionHtml(s: DocSection): string {
  return [
    s.heading ? `<h2>${escape(s.heading)}</h2>` : '',
    ...s.paragraphs.map((p) => `<p>${escape(p)}</p>`),
    s.list ? `<ul>${s.list.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>` : '',
    s.table
      ? `<table><thead><tr>${s.table.columns.map((c, i) => `<th${i ? ' class="num"' : ''}>${escape(c)}</th>`).join('')}</tr></thead><tbody>${s.table.rows
          .map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${escape(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody>${s.table.foot ? `<tfoot><tr>${s.table.foot.map((c, i) => `<td${i ? ' class="num"' : ''}>${escape(c)}</td>`).join('')}</tr></tfoot>` : ''}</table>`
      : '',
  ].join('\n');
}

/**
 * A standalone, printable A4 page for one document. No scripts: the browser's
 * own Print saves it as PDF. Everything that came from data is escaped.
 */
export function renderEmploymentDocumentHtml(doc: EmploymentDocument, options: { logoUrl: string; generatedNote: string; evidence?: SignatureEvidence }): string {
  const ev = options.evidence;
  const at = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`;
  // With evidence, the signature blocks say who signed and when, instead of offering blank lines.
  const signatures = ev
    ? doc.signatures.map((s, i) =>
        i === 0
          ? { party: s.party, lines: [s.lines[0]!, s.lines[1]!, `Issued electronically by ${ev.issuedBy}, ${at(ev.issuedAt)}`] }
          : { party: s.party, lines: ev.signed ? [`Signed electronically by ${ev.signed.name} <${ev.signed.email}>`, at(ev.signed.at), 'Signed in to the Ensaar employee portal as that address'] : ["Awaiting the employee's signature"] },
      )
    : doc.signatures;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${escape(`${doc.title}: ${doc.preamble.find((l) => l.startsWith('To: '))?.slice(4) ?? doc.reference}`)}</title>
<style>
  @page { size: A4; margin: 18mm 18mm 20mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef2f6; color: #1f2d3d; font: 10.5pt/1.55 'Segoe UI', -apple-system, Roboto, Helvetica, Arial, sans-serif; }
  .sheet { max-width: 210mm; margin: 24px auto; background: #fff; padding: 18mm; box-shadow: 0 2px 16px rgba(12,35,67,.12); }
  .note { max-width: 210mm; margin: 16px auto 0; padding: 10px 14px; background: #fff8eb; border-left: 4px solid #d97706; color: #7a4100; font-size: 9.5pt; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #008ecf; padding-bottom: 10px; margin-bottom: 18px; }
  header img { height: 34px; }
  header .meta { text-align: right; font-size: 8.5pt; color: #6b7a90; }
  h1 { font-size: 15pt; color: #0c2343; margin: 0 0 14px; text-transform: uppercase; letter-spacing: .04em; }
  h2 { font-size: 10.5pt; color: #0c2343; margin: 16px 0 6px; }
  h3.annex { font-size: 12pt; color: #0c2343; margin: 0 0 10px; }
  p { margin: 0 0 8px; text-align: justify; }
  ul { margin: 0 0 8px 18px; padding: 0; } li { margin-bottom: 4px; }
  .preamble p { margin-bottom: 4px; text-align: left; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 10pt; }
  th, td { border: 1px solid #d6dde7; padding: 6px 9px; text-align: left; }
  th { background: #f3f6fa; color: #0c2343; } td.num, th.num { text-align: right; } tfoot td { font-weight: 700; background: #f3f6fa; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; page-break-inside: avoid; }
  .signatures .party { font-weight: 700; color: #0c2343; margin-bottom: 8px; }
  .signatures p { margin: 0 0 14px; text-align: left; }
  .annexure { page-break-before: always; margin-top: 24px; }
  .fingerprint { margin-top: 18px; font: 8pt monospace; color: #6b7a90; word-break: break-all; text-align: left; }
  footer { margin-top: 26px; padding-top: 8px; border-top: 1px solid #d6dde7; font-size: 8pt; color: #6b7a90; text-align: center; }
  @media print { body { background: #fff; } .sheet { margin: 0; padding: 0; box-shadow: none; max-width: none; } .note { display: none; } }
</style></head>
<body>
<div class="note">${escape(options.generatedNote)} Use your browser's Print to save this as a PDF.</div>
<div class="sheet">
  <header><img src="${escape(options.logoUrl)}" alt="Ensaar Global"><div class="meta">${escape(ENSAAR_PARTY.legalName)}<br>Ref. ${escape(doc.reference)}</div></header>
  <h1>${escape(doc.title)}</h1>
  <div class="preamble">${doc.preamble.map((l) => `<p>${escape(l)}</p>`).join('')}</div>
  ${doc.sections.map(sectionHtml).join('\n')}
  <div class="signatures">${signatures.map((s) => `<div><div class="party">${escape(s.party)}</div>${s.lines.map((l) => `<p>${escape(l)}</p>`).join('')}</div>`).join('')}</div>
  ${doc.annexures.map((a) => `<div class="annexure"><h3 class="annex">${escape(a.title)}</h3>${a.sections.map(sectionHtml).join('\n')}</div>`).join('\n')}
  ${ev ? `<p class="fingerprint">Document fingerprint (SHA-256): ${escape(ev.hash)}</p>` : ''}
  <footer>${escape(ENSAAR_PARTY.legalName)} &middot; ${escape(ENSAAR_ADDRESS)} &middot; CIN ${escape(siteConfig.cin)} &middot; ${escape(siteConfig.hrEmail)}</footer>
</div>
</body></html>`;
}
