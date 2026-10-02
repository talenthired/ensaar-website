import { siteConfig } from '@/lib/utils';
import { ENSAAR_PARTY, NOTICE_DAYS, PROBATION_MONTHS } from './agreement';
import { PROVIDENT_FUND_TERMS, SALARY_PAY_DAY, type DocSection, type DocTable } from './employment-docs';
import { HOLIDAYS_PER_YEAR } from './holidays';

/**
 * The Ensaar Employee Handbook: the policies the offer letter and employment
 * agreement point to ("Ensaar's policies", "Ensaar's leave policy").
 *
 * Written for an Indian IT services employer whose people work remotely for a
 * client abroad, in line with normal Indian IT practice rather than a factory
 * reading of the Shops and Establishments Act (Ensaar is IT/ITES, which
 * Telangana exempts from the hours, night-work and notified-holiday sections).
 * It is guidance, not a contract: the employment agreement wins on any conflict.
 *
 * Pure and deterministic, like the employment documents: the text is frozen and
 * fingerprinted when an employee acknowledges it. Bump HANDBOOK_VERSION for any
 * change in wording, and say what changed in HANDBOOK_CHANGES.
 */

export const HANDBOOK_VERSION = '2026-10-02.1';

/** What changed in each version, newest first, in a sentence or two the employee reads. */
export const HANDBOOK_CHANGES: Array<{ version: string; summary: string }> = [
  { version: '2026-10-02.1', summary: 'First edition of the Ensaar Employee Handbook.' },
];

// Ensaar's numbers. Change them here; the handbook and the leave tracker both read them.
/** Paid leave days a full-time employee earns in a calendar year (personal and sick time together). */
export const PTO_DAYS_PER_YEAR = 17;
/** Extra paid leave days a year once an employee has this many years of continuous service. */
export const LONG_SERVICE_YEARS = 3;
export const LONG_SERVICE_EXTRA_DAYS = 2;
/** Most unused paid leave days encashed at the end of a year, after probation. */
export const ENCASHMENT_MAX_DAYS = 5;
export const MATERNITY_WEEKS = 26;
/** Months of service before maternity leave is paid, as the Maternity Benefit Act sets (80 days' work in practice). */
export const MATERNITY_SERVICE_MONTHS = 6;
export const MATERNITY_NOTICE_WEEKS = 8;
export const PATERNITY_DAYS = 2;
export const PATERNITY_WITHIN_MONTHS = 3;
/** Late by more than this, the employee tells their manager. */
export const LATE_NOTICE_MINUTES = 30;
/** Consecutive working days absent without contact before it counts as job abandonment. */
export const ABANDONMENT_DAYS = 2;
/** A medical certificate is asked for once sick leave runs past this many consecutive days. */
export const SICK_CERTIFICATE_AFTER_DAYS = 3;
/** Employees at which Ensaar must have its own Internal Committee under the POSH Act. */
export const POSH_INTERNAL_COMMITTEE_FROM = 10;

export type Handbook = {
  title: string;
  version: string;
  effectiveFrom: string;
  sections: DocSection[];
  acknowledgement: string[];
};

export type HandbookOptions = {
  /** True once Ensaar has constituted its Internal Committee (10 or more employees). */
  internalCommittee: boolean;
  /** Who signs for Ensaar, e.g. "Shanimole, Managing Director". */
  issuedBy: string;
};

const hr = () => siteConfig.hrEmail;

const ncnsTable: DocTable = {
  columns: ['Unreported absence', 'What happens'],
  rows: [
    ['First time', 'Verbal warning, noted on your file'],
    ['Second time', 'Written warning and a conversation with HR'],
    ['Third time', 'Final written warning'],
    ['Fourth time', 'Disciplinary action, which may include ending your employment'],
  ],
};

const leaveTable: DocTable = {
  columns: ['Leave', 'Entitlement'],
  rows: [
    ['Paid leave (personal and sick)', `${PTO_DAYS_PER_YEAR} days a calendar year, pro-rated in the year you join; ${PTO_DAYS_PER_YEAR + LONG_SERVICE_EXTRA_DAYS} days after ${LONG_SERVICE_YEARS} years' service`],
    ['Maternity leave', `Up to ${MATERNITY_WEEKS} weeks paid, as the Maternity Benefit Act provides`],
    ['Paternity leave', `${PATERNITY_DAYS} days paid, within ${PATERNITY_WITHIN_MONTHS} months of the birth`],
    ['Holidays', `${HOLIDAYS_PER_YEAR} paid holidays a year, on the calendar your client agrees`],
    ['Unpaid leave', 'By agreement, once paid leave is used up'],
  ],
};

/** The handbook itself. */
export function buildHandbook(options: HandbookOptions): Handbook {
  const posh = options.internalCommittee
    ? `Complaints of sexual harassment are heard by Ensaar's Internal Committee under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013. Write to ${hr()}, marked "POSH complaint", and HR will pass it to the Committee the same day. Its members are listed in the employee portal.`
    : `Ensaar has fewer than ${POSH_INTERNAL_COMMITTEE_FROM} employees, so under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 complaints of sexual harassment are heard by the Local Committee of the district where you live or work. You may complain to it directly, through the District Officer, or ask ${hr()} to help you do so. Once Ensaar has ${POSH_INTERNAL_COMMITTEE_FROM} or more employees it will set up its own Internal Committee and update this handbook.`;

  const sections: DocSection[] = [
    {
      heading: '1. About this handbook',
      paragraphs: [
        `This handbook sets out how ${ENSAAR_PARTY.legalName} ("Ensaar") works with its employees: what you can expect from Ensaar, and what Ensaar expects from you. Please read it, and keep it for reference; the current version is always in the Ensaar employee portal.`,
        'Your terms of employment are in your offer letter and employment agreement, which are governed by Indian law. This handbook explains how those terms work day to day. It is not a contract, and if anything in it differs from your employment agreement, the agreement applies.',
        'Ensaar may update, add to or withdraw any policy in this handbook to reflect changes in the law, in its business or in a client\'s needs. When it does, Ensaar will tell you what changed and the date the change applies from.',
        `If anything here is unclear, ask ${hr()}.`,
      ],
    },
    {
      heading: '2. How your employment works',
      paragraphs: [
        'Ensaar is your employer. You work full time on assignments for one of Ensaar\'s clients (the "Client"), which directs your day-to-day work and with whose team you work. Your pay, leave, conduct matters and anything to do with your employment are between you and Ensaar; your Client manager is your first point of contact for the work itself.',
        `You are on probation for the first ${PROBATION_MONTHS} months, as your offer letter says. Ensaar will confirm in writing when you complete it. During and after probation, either side may end employment with ${NOTICE_DAYS} days' written notice, or pay in place of notice, as your employment agreement sets out.`,
      ],
    },
    {
      heading: '3. Equal opportunity and respect at work',
      paragraphs: [
        'Ensaar hires, pays, develops and promotes people on merit, skills and performance. It does not discriminate on caste, religion, race, gender, gender identity, sexual orientation, marital status, age, disability or any other characteristic protected by Indian law, and it makes reasonable adjustments for employees with disabilities in line with the Rights of Persons with Disabilities Act, 2016.',
        'Everyone is to be treated with dignity, by colleagues, by the Client\'s team and by you. Harassment, bullying, threats and offensive language or content are not acceptable, in meetings, chat, email or anywhere else work happens.',
      ],
    },
    {
      heading: 'Prevention of sexual harassment',
      paragraphs: [
        'Sexual harassment includes unwelcome physical contact or advances, a demand or request for sexual favours, sexually coloured remarks, showing pornography, and any other unwelcome physical, verbal or non-verbal conduct of a sexual nature. It applies wherever work happens, including online and at the Client\'s premises.',
        posh,
        'A complaint should be made within three months of the incident (the Committee can extend this). Complaints are kept confidential, and no one who complains or helps an inquiry in good faith will be treated less well for doing so.',
      ],
    },
    {
      heading: 'Raising a concern',
      paragraphs: [
        `Talk to your Client manager about issues with the work itself. For anything about your employment, or if you are not comfortable raising it with the Client, write to ${hr()}. HR will acknowledge it within two working days and tell you what will happen next. If you are not satisfied with the outcome, you may ask for it to be reviewed by Ensaar's Managing Director. No one will be treated less well for raising a concern in good faith.`,
      ],
    },
    {
      heading: '4. Safety, alcohol and drugs',
      paragraphs: [
        'Do not work under the influence of alcohol or drugs, and do not use, possess or deal in illegal drugs while working or on Ensaar or Client business. If a prescribed medicine may affect your work, tell HR. If you are struggling with alcohol or drugs, Ensaar would rather help you find support than find out later.',
        'Violence, threats or intimidation of anyone you deal with through work are serious misconduct. If you visit Ensaar\'s or a Client\'s premises, do not bring weapons, and follow the site\'s safety rules. Report any threat or safety concern to HR straight away.',
      ],
    },
    {
      heading: '5. Joining, background checks and your records',
      paragraphs: [
        'Your offer depends on verification of your identity, PAN, education and previous employment, and on references. Ensaar may use a verification agency. Information found is shared only with those who need it. If any information you gave turns out to be false or materially incomplete, Ensaar may withdraw the offer or end your employment.',
        'Keep your details in the employee portal up to date: address, phone, emergency contact, bank account and anything else that affects your pay, tax or benefits. Your records are confidential and seen only by those at Ensaar who need them; your employment agreement explains how Ensaar uses your personal data.',
      ],
    },
    {
      heading: '6. Confidentiality, intellectual property and privacy',
      paragraphs: [
        'You will see information belonging to Ensaar and to the Client that is not public: code, data, customers, plans, prices and people. Use it only for your work, keep it on the systems provided for it, and do not share it with anyone who does not need it, during your employment or after. Work you create in your job belongs to Ensaar or the Client, as your employment agreement sets out.',
        'Ensaar and the Client may monitor the use of their systems, devices and accounts (email, chat, files and internet use) for security, compliance and investigations, in a proportionate and lawful way. Do not record calls or meetings, or take screenshots of confidential material, without permission.',
      ],
    },
    {
      heading: '7. Conflicts of interest and outside work',
      paragraphs: [
        'Avoid situations where your own interests conflict, or appear to conflict, with Ensaar\'s or the Client\'s. Tell HR before you take up any other job, freelance or consulting work, or a business interest in a competitor, supplier or client of Ensaar or the Client; you need Ensaar\'s written consent for any other paid work while you are employed full time.',
        'Do not offer or accept gifts, hospitality or payments that could influence a business decision, and never offer or accept a bribe. A token gift of modest value is fine; anything more, ask HR first.',
      ],
    },
    {
      heading: '8. Conduct at work',
      paragraphs: ['You represent Ensaar in everything you do for the Client. Ensaar expects you to:'],
      list: [
        'work honestly and diligently, and be courteous and professional with everyone',
        "follow the Client's reasonable instructions and its rules on security, systems, data and conduct",
        'keep accurate records of your work, and never misstate time, attendance or results',
        'use equipment, accounts and software only for authorised purposes, and never bypass security controls',
        'dress appropriately for video calls and any visit to an office',
        'not work from outside India without Ensaar\'s written approval, as your employment agreement says',
        'not post confidential information, or speak for Ensaar or the Client, on social media',
      ],
    },
    {
      heading: '9. Working hours, attendance and night work',
      paragraphs: [
        'You work a five-day week, with at least one weekly day off. Your hours are agreed with the Client so that you overlap with its team, and you are expected to be available during them. Your work, including any agreed extra hours, will not exceed 48 hours in a week. Your salary is a consolidated salary for your role; extra hours are paid only where they are agreed in advance or the law requires it.',
        `If you will be more than ${LATE_NOTICE_MINUTES} minutes late, or cannot work on a day, tell your Client manager and ${hr()} as soon as you can, before your start time. Planned time off is requested in advance in the portal (see Leave).`,
        'Working with a team abroad can mean working in the evening or at night, India time. Work after 8:30 pm is done from home, never by requiring you to travel at night, and only with your consent, which you give and can withdraw in the employee portal. If you withdraw it, Ensaar will discuss your hours with you and the Client.',
      ],
    },
    {
      heading: 'Unreported absence and job abandonment',
      paragraphs: [
        'Not turning up for work without telling your Client manager or HR beforehand ("no call, no show") causes real problems for the Client\'s team. In a genuine emergency, a family member may tell Ensaar on your behalf on the same day; Ensaar may ask for evidence when you are back.',
      ],
      table: ncnsTable,
    },
    {
      paragraphs: [
        `If you are absent for ${ABANDONMENT_DAYS} or more consecutive working days without contacting Ensaar, and do not respond when Ensaar tries to reach you, Ensaar will write to you asking you to explain. If you still do not respond by the date given, Ensaar may treat your employment as abandoned and end it in writing. You are paid for the days you worked, and any notice you did not serve is settled as your employment agreement provides.`,
      ],
    },
    {
      heading: '10. Leave',
      paragraphs: ['Your leave at a glance:'],
      table: leaveTable,
    },
    {
      heading: 'Paid leave',
      paragraphs: [
        `Paid leave covers holidays, personal time and sickness. You earn ${PTO_DAYS_PER_YEAR} days for each calendar year (January to December), pro-rated by month in the year you join. Once you have completed ${LONG_SERVICE_YEARS} years of continuous service, you earn ${LONG_SERVICE_EXTRA_DAYS} more days a year.`,
        'Request planned leave in the employee portal as early as you can, and at least a week ahead for more than two days. Your Client manager approves it; Ensaar sees every request and can step in if needed. For sickness or an emergency, tell your Client manager and HR on the day and record the leave in the portal when you can. Sick leave is recorded, not refused.',
        `If you are off sick for more than ${SICK_CERTIFICATE_AFTER_DAYS} consecutive working days, Ensaar may ask for a medical certificate.`,
        'When your paid leave is used up, further time off is unpaid (loss of pay) and needs approval.',
      ],
    },
    {
      heading: 'Carry forward and encashment',
      paragraphs: [
        `Once you have completed probation, up to ${ENCASHMENT_MAX_DAYS} unused paid leave days are paid out (encashed) at the end of each calendar year, and any further unused days lapse. Unused leave earned during probation lapses at the end of the year in which probation ends, unless the law requires otherwise. When you leave Ensaar, unused paid leave for the current year is paid in your final settlement.`,
      ],
    },
    {
      heading: 'Client shutdowns',
      paragraphs: [
        'Some clients close for holidays or a year-end break. If your Client closes on a day that is not one of your holidays, Ensaar will tell you in advance, and you may be asked to take paid leave for those days, or unpaid leave if you have none left.',
      ],
    },
    {
      heading: 'Maternity and paternity leave',
      paragraphs: [
        `If you have worked for Ensaar for at least ${MATERNITY_SERVICE_MONTHS} months (in practice, 80 days in the year before your expected delivery), you are entitled to up to ${MATERNITY_WEEKS} weeks of paid maternity leave, as the Maternity Benefit Act, 1961 provides, including for adoption and surrogacy on the terms the Act sets. Please tell HR at least ${MATERNITY_NOTICE_WEEKS} weeks before you plan to start it, with a medical certificate of the expected date or the adoption papers. You return to your role, or one like it, afterwards, and any request for more time off or a different working pattern will be considered.`,
        `New fathers have ${PATERNITY_DAYS} days of paid paternity leave, taken within ${PATERNITY_WITHIN_MONTHS} months of the birth or adoption, for up to two children.`,
      ],
    },
    {
      heading: 'Leave during notice',
      paragraphs: [
        'While you are serving notice, paid leave is not normally granted, so that you can hand over your work. Sick leave is the exception; if you are off sick during notice, your last working day may be moved by the same number of days, by agreement.',
      ],
    },
    {
      heading: '11. Holidays',
      paragraphs: [
        `You have ${HOLIDAYS_PER_YEAR} paid holidays a year: India's national holidays, plus days chosen with your Client so that you are off when its team is. You and your colleagues at the Client propose the calendar in the employee portal and the Client approves it; Ensaar can step in if needed. Once approved, the calendar is fixed for the year.`,
        'A day that is a holiday for the Client but not on your calendar, or the other way round, is a normal working day. If you are asked to work on one of your holidays, you get a day off in its place.',
      ],
    },
    {
      heading: '12. Pay',
      paragraphs: [
        `You are paid monthly, by bank transfer to the account in the portal, no later than the ${SALARY_PAY_DAY}th of the following month, with a payslip in the employee portal. Ensaar deducts income tax (TDS), professional tax and any other amount the law requires, as your offer letter explains.`,
        `If you think your pay or a deduction is wrong, tell ${hr()} straight away; Ensaar will look into it and correct any error promptly. Any amount you owe Ensaar may be recovered from your final settlement only within the limits the law allows.`,
      ],
    },
    {
      heading: 'Statutory benefits',
      paragraphs: [
        PROVIDENT_FUND_TERMS,
        'Gratuity is paid in line with the Payment of Gratuity Act (or the provision that replaces it), normally after five years\' continuous service, at no cost to you.',
        'Ensaar does not currently provide health insurance. If it introduces it, or any other benefit not required by law, the terms will be set out in a separate note and may be changed or withdrawn by notice.',
      ],
    },
    {
      heading: '13. Performance and development',
      paragraphs: [
        'Ensaar reviews performance once a year, for the year April to March, taking account of the Client\'s feedback and your own self-assessment: the quality and timeliness of your work, your skills, communication and teamwork, and how you live up to this handbook. Joiners after October are reviewed in the next cycle. Time on maternity leave does not count against you.',
        'Any change in pay or role is agreed between Ensaar and the Client and confirmed to you in writing. Your Client manager or Ensaar may also hold check-ins during the year.',
      ],
    },
    {
      heading: '14. When things go wrong: corrective action',
      paragraphs: [
        'Most problems are best fixed by an early, honest conversation. When that is not enough, Ensaar follows these steps for performance, attendance or conduct:',
      ],
      list: [
        'a verbal warning, noted on your file',
        'a written warning, saying what needs to change and by when',
        'a final written warning',
        'ending your employment, with notice or pay in place of notice',
      ],
    },
    {
      paragraphs: [
        'Ensaar may start at a later step, or suspend you on pay while it looks into a matter, where the issue is serious. Serious misconduct, such as dishonesty, fraud, theft, violence, harassment, a serious breach of confidentiality or of the Client\'s security rules, or giving false information, may lead to dismissal without notice, as your employment agreement sets out.',
        'Only Ensaar takes disciplinary action, never the Client. Before any decision, Ensaar tells you in writing what is alleged or what the concern is, shows you the evidence it relies on, and gives you a fair chance to respond in writing, normally within three working days. Warnings and letters are sent to you by email and are available in the employee portal, where you can acknowledge them and reply.',
      ],
    },
    {
      heading: '15. Leaving Ensaar',
      paragraphs: [
        `To resign, write to ${hr()} with your notice, which is ${NOTICE_DAYS} days unless your employment agreement says otherwise. Ensaar may agree a shorter notice period, or ask you to stop work and pay you for the notice instead. Use your notice to hand over your work properly.`,
        'By your last day, return all equipment, documents and access belonging to Ensaar or the Client, and delete any of their information from your own devices. Ensaar may invite you to a short, voluntary exit conversation.',
        'Ensaar pays your final settlement (salary to your last day, unused leave and anything else due, less lawful deductions) within two working days of your last day, and gives you a relieving letter and experience certificate.',
      ],
    },
    {
      heading: '16. Changes to this handbook',
      paragraphs: [
        `This is version ${HANDBOOK_VERSION}. Ensaar will email you when a new version is published, with a short note of what changed, and ask you to acknowledge it in the employee portal. A policy applies from the date Ensaar gives, whether or not you have acknowledged it yet.`,
        `Issued for Ensaar by ${options.issuedBy}.`,
      ],
    },
  ];

  return {
    title: 'Ensaar Employee Handbook',
    version: HANDBOOK_VERSION,
    effectiveFrom: HANDBOOK_VERSION.slice(0, 10),
    sections,
    acknowledgement: [
      `I have received the Ensaar Employee Handbook, version ${HANDBOOK_VERSION}, and I have read it or will read it.`,
      'I understand that it applies to me and that I am expected to follow it throughout my employment.',
      'I understand that it is a guide to Ensaar\'s policies, not a contract of employment, and that my terms of employment are in my offer letter and employment agreement.',
      'I understand that Ensaar may update it, and that I will be told when it does.',
    ],
  };
}

/** The canonical plain text: what is fingerprinted when an employee acknowledges, and printed in the PDF. */
export function handbookToText(handbook: Handbook): string {
  const section = (s: DocSection) => [
    ...(s.heading ? [s.heading] : []),
    ...s.paragraphs,
    ...(s.list ?? []).map((i) => `- ${i}`),
    ...(s.table ? [s.table.columns.join(' | '), ...s.table.rows.map((r) => r.join(' | ')), ...(s.table.foot ? [s.table.foot.join(' | ')] : [])] : []),
    '',
  ];
  return [
    handbook.title.toUpperCase(),
    `Version ${handbook.version}, effective ${handbook.effectiveFrom}`,
    '',
    ...handbook.sections.flatMap(section),
    'ACKNOWLEDGEMENT',
    ...handbook.acknowledgement,
  ].join('\n');
}
