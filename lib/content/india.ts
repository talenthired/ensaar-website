/**
 * India employment and entity facts, in one place.
 *
 * The EOR price, the statutory rates, and the timelines appear on the service
 * pages, in the FAQ, and in the assistant's knowledge base. Three copies of a
 * number is three chances to quote a stale one to a buyer, so every surface
 * reads these constants and `test/india-content.test.ts` asserts they agree.
 *
 * Statutory figures are current as of INDIA_RULES_ASOF. They change with the
 * Union Budget and with state notifications: check the date before trusting a
 * number in a proposal, and bump it when you re-verify.
 */

/** Last date the statutory figures below were checked against source. */
export const INDIA_RULES_ASOF = '2026-09-23';

/**
 * Published EOR price: where the fee starts, per employee, per month. A
 * client's actual fee is agreed with them and written into each Schedule A, so
 * the site always says "from", never that everyone pays this.
 *
 * Stated in USD because the buyer is a foreign company and pays in USD. India
 * specialists sit at roughly $99 to $399 and the global platforms at $499 to
 * $699 for the same India hire, so this is deliberately mid-band: cheaper than
 * a platform, not competing on being the cheapest.
 */
export const EOR_PRICE_USD = 199;

/** One month of salary, the standard India recruitment fee, as a percentage. */
export const RECRUITMENT_FEE_PERCENT = 8.33;

/** Days a replacement is covered after a hire joins. */
export const REPLACEMENT_GUARANTEE_DAYS = 90;

export type StatutoryItem = {
  name: string;
  rate: string;
  note: string;
};

/**
 * What an employer owes on top of salary in India. These are the employer-side
 * amounts only: the employee's own deductions are separate and come out of the
 * same gross.
 */
export const STATUTORY_COSTS: StatutoryItem[] = [
  {
    name: 'Provident fund (EPF)',
    rate: '12% of basic',
    note: 'Commonly applied on the statutory wage ceiling of Rs 15,000, so Rs 1,800 a month, plus small administrative charges. Applying it on full basic instead is a choice some employers make, and it costs more.',
  },
  {
    name: 'State insurance (ESI)',
    rate: '3.25% of gross',
    note: 'Only where gross pay is Rs 21,000 a month or below. Most engineering salaries are above the threshold, so this usually does not apply.',
  },
  {
    name: 'Gratuity',
    rate: '4.81% of basic',
    note: 'A statutory payment after five years of continuous service. It is accrued monthly as a liability rather than paid out, so the cost is real from month one.',
  },
  {
    name: 'Professional tax',
    rate: 'Up to Rs 2,500 a year',
    note: 'Set by each state, typically Rs 200 a month. The Rs 2,500 annual ceiling is constitutional, so no state can charge more.',
  },
];

/**
 * The honest version of "what does it add up to". A single percentage is the
 * usual marketing answer and it misleads at senior salaries, where the EPF
 * ceiling caps the largest component.
 */
export const STATUTORY_SUMMARY =
  'Statutory contributions add roughly 13% to 18% on top of gross at junior and mid salaries. At senior salaries the share falls, often below 5%, because provident fund is capped at a Rs 15,000 wage base while the salary is not.';

/** What the EOR fee covers. Written as what Ensaar does, not as feature nouns. */
export const EOR_INCLUDED: string[] = [
  'An employment contract that holds up under Indian law, with your IP and confidentiality terms assigned to you',
  'Monthly payroll, payslips, and salary paid on time in rupees',
  'Provident fund, state insurance where it applies, professional tax, and monthly TDS, filed and paid',
  'Form 16 at year end, and the UAN the employee needs to move their provident fund later',
  'Leave, probation, and notice terms that match the state Shops and Establishments Act that governs them',
  'Statutory policies a compliant Indian employer must have, including the POSH committee obligation once headcount reaches ten',
  'Gratuity accrued from day one, not discovered at year five',
  'Onboarding, equipment reimbursement, and a clean, lawful exit when someone leaves',
];

/** What the fee does not cover, stated before a buyer has to ask. */
export const EOR_EXCLUDED: string[] = [
  'The salary itself, and any bonus or allowance you agree with the employee',
  'Statutory employer contributions, which are passed through at cost with no margin',
  'Equipment you choose to buy, and reimbursements you approve',
  'A refundable deposit of one month\'s total cost for each employee, paid before they start and returned when they leave',
  'Recruitment, if you want Ensaar to find the person rather than bring your own',
];

export type Step = {
  title: string;
  detail: string;
};

export const EOR_STEPS: Step[] = [
  {
    title: 'Tell us the role and the offer',
    detail:
      'Salary, start date, location, and anything specific to the role. If you already have the person, we start here. If you do not, recruitment runs first.',
  },
  {
    title: 'We paper the employment',
    detail:
      'A compliant offer and contract, issued by Ensaar as the legal employer in India, carrying your IP assignment and confidentiality terms.',
  },
  {
    title: 'They join, usually inside two weeks',
    detail:
      'Five to ten working days is typical from the day we have the candidate details and documents. Faster is possible when documents arrive clean.',
  },
  {
    title: 'You direct the work, we run the employment',
    detail:
      'You manage the person day to day. Ensaar runs payroll, files the statutory returns, tracks leave, and handles the paperwork nobody enjoys.',
  },
];

export const GCC_PHASES: Step[] = [
  {
    title: 'Start with a pod',
    detail:
      'Three to fifteen people, employed through Ensaar, working only for you. No entity, no lease, no India registration. This is the step most teams should take first, because it tests the operating model before it costs anything structural.',
  },
  {
    title: 'Run it like a team, not a vendor contract',
    detail:
      'Your managers set the work. Ensaar handles employment, payroll, equipment, access, and the India-side operational load, and reports on it monthly.',
  },
  {
    title: 'Grow only when the pod has earned it',
    detail:
      'Add roles as the work proves out. A pod that cannot justify its next hire is a signal worth having early, and it costs far less to learn here than after an entity exists.',
  },
  {
    title: 'Convert to your own entity when the maths changes',
    detail:
      'Past roughly twenty to thirty people, your own subsidiary usually beats per-person fees. Ensaar sets it up, moves the team across with their service continuity intact, and hands you a running centre.',
  },
];

/** Entity facts for the conversion conversation. Verified as of INDIA_RULES_ASOF. */
export const ENTITY_FACTS: StatutoryItem[] = [
  {
    name: 'Structure',
    rate: 'Private limited, wholly owned',
    note: 'Foreign parents can hold 100% under the automatic FDI route in most sectors, with no prior approval needed.',
  },
  {
    name: 'Directors',
    rate: 'Two minimum',
    note: 'At least one must have lived in India for 182 days or more in the previous calendar year. This is the requirement that most often delays a foreign parent.',
  },
  {
    name: 'Incorporation',
    rate: '7 to 10 working days',
    note: 'With clean documents. Government filing fees are nil up to Rs 15 lakh of authorised capital; stamp duty varies by state. Name rejections are the usual cause of a longer timeline.',
  },
  {
    name: 'After funding',
    rate: 'Two filing deadlines',
    note: 'Share allotment money must arrive within 60 days, and Form FC-GPR must be filed with the RBI within 30 days of allotment. Missing either is expensive to unwind.',
  },
  {
    name: 'Transfer pricing',
    rate: '15.5% safe harbour',
    note: 'A captive serving only its parent is paid cost plus a margin. Budget 2026 set a uniform 15.5% safe harbour margin for IT and ITeS and raised the eligibility threshold to Rs 2,000 crore, which takes most new centres out of dispute territory.',
  },
];

/**
 * What Ensaar actually commits to operationally.
 *
 * Deliberately process commitments, not badges. Competitors in this market lean
 * on certification logos and "100% compliant" claims; a buyer can check the
 * items below against what arrives in their inbox each month, which is worth
 * more than a logo and is true today.
 */
export const COMPLIANCE_COMMITMENTS: StatutoryItem[] = [
  {
    name: 'Filed on the statutory calendar',
    rate: 'Monthly',
    note: 'Provident fund and ESI by the 15th, TDS by the 7th, professional tax on the state schedule. Late filing is our cost to carry, not yours.',
  },
  {
    name: 'Documented at onboarding',
    rate: 'Every hire',
    note: 'Identity, PAN, prior employment, and education verified before the first working day, with the records retained for audit.',
  },
  {
    name: 'A statutory policy pack',
    rate: 'From day one',
    note: 'Leave, working hours, notice, and the POSH policy with its internal committee, matched to the state Shops and Establishments Act that applies.',
  },
  {
    name: 'Records you can inspect',
    rate: 'On request',
    note: 'Payslips, challans, filing acknowledgements, and the employment file for anyone we employ for you. You should be able to audit your provider, so we assume you will.',
  },
];

/**
 * Scope, stated before a buyer assumes otherwise. India specialists beat global
 * platforms on India and lose to them everywhere else, and pretending
 * differently wastes a call.
 */
export const SCOPE_NOTE =
  'Ensaar employs people in India, and only in India. If you need employment in several countries at once, a global platform will serve you better and we will say so on the first call. What we offer instead is depth in one country: the statutory detail, the state differences, and the entity path when you outgrow an EOR.';

/**
 * Permanent establishment. Stated plainly because the confident version of this
 * answer, in either direction, is wrong, and a buyer who later discovers that
 * has a tax problem and a trust problem.
 */
export const PE_POSITION =
  'Hiring through an EOR does not automatically create a permanent establishment in India, and it does not automatically protect you from one. PE turns on conduct: it is the risk of someone in India habitually concluding contracts in your name, or a fixed place of business being treated as yours. An engineer building your product is a very different case from a salesperson closing your deals. We will tell you which side of that line a role sits on, and we will say so before you hire rather than after.';
