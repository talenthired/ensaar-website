import { siteConfig } from '@/lib/utils';
import { INVOICE_DAY, LATE_INTEREST_PERCENT_PER_MONTH, PAYMENT_DAYS } from './billing';
import {
  entityTypeLabel,
  formatDay,
  formatInr,
  formatUsd,
  usStateName,
  type CompanyDetails,
  type EmployeeInput,
} from './onboarding';

/**
 * The Employer of Record agreement, in two parts:
 *
 *   - the master services agreement, signed once per client company, and
 *   - one Schedule A per employee, which names the person and their terms and
 *     is signed by both parties when they are hired.
 *
 * Both are pure and deterministic: the same inputs always give the same text,
 * so the hash taken at signing identifies exactly what was signed, and the
 * stored snapshot is what is shown afterwards even if this template changes.
 *
 * How each Employee is charged is chosen per Schedule A: a Service Fee plus
 * Employment Costs at cost, or one all-in Loaded Cost (lib/eor/onboarding.ts,
 * Pricing). The commercial terms mirror what ensaar.com publishes (a monthly fee per
 * employee, no setup fee, no minimum term, a refundable deposit of one month's
 * total cost for the employees Ensaar chooses to ask it for, statutory costs
 * passed through at cost).
 * Assets are the one thing not at cost: the Customer pays for them, and when
 * Ensaar buys, handles or ships one it recovers every cost plus PROCUREMENT_FEE_PERCENT.
 * The invoice date, payment term and late interest come from lib/eor/billing.ts,
 * which the reminder emails also read, so the two cannot drift apart.
 *
 * Late payment is the Customer's cost (interest, no new hires, termination, an
 * indemnity). Neither the agreement nor any email says an Employee's pay waits
 * for the Customer: Ensaar is the employer, and Indian law makes wages due on
 * time whatever the Customer does.
 * Bump AGREEMENT_VERSION whenever the wording of either part changes: customers
 * cannot sign a version until an owner records its legal review in Basecamp.
 */
export const AGREEMENT_VERSION = '2026-10-01.1';

/** Ensaar's full postal address, as registered for GST. */
export const ENSAAR_ADDRESS = [siteConfig.address.street, siteConfig.address.city, `${siteConfig.address.region} ${siteConfig.address.postalCode}`, siteConfig.address.country].join(', ');

export const ENSAAR_PARTY = {
  legalName: siteConfig.legalName,
  description: `a private limited company incorporated in India, with its principal place of business at ${ENSAAR_ADDRESS} (GSTIN ${siteConfig.gstin})`,
};

export const PROBATION_MONTHS = 3;
export const NOTICE_DAYS = 30;
/** The least time an Employee is given to improve before their employment is ended for performance. */
export const IMPROVEMENT_DAYS = 30;
/** Charged on the Asset Costs Ensaar incurs (a purchase price it paid, shipping, handling), on top of those costs. */
export const PROCUREMENT_FEE_PERCENT = 5;
/** The day of the month by which the Customer tells Ensaar about that month's pay changes. */
export const PAYROLL_INPUT_DAY = 10;

export type AgreementSection = { heading: string; paragraphs: string[] };
export type AgreementDocument = {
  version: string;
  title: string;
  parties: string[];
  sections: AgreementSection[];
  schedule: { label: string; value: string }[];
};

function customerParty(companyName: string, company: CompanyDetails | null): string {
  const name = company?.legalName || companyName;
  const description = company
    ? `a ${entityTypeLabel(company.entityType).toLowerCase()} organised ${company.incorporationState ? `under the laws of ${usStateName(company.incorporationState)}` : 'in the United States'}, with its registered address at ${[company.addressLine1, company.addressLine2, company.city, `${company.state} ${company.zip}`].filter(Boolean).join(', ')}, United States (EIN ${company.ein})`
    : 'a company organised in the United States (entity details to be completed during onboarding)';
  return `${name}, ${description} (the "Customer").`;
}

/** The master services agreement, signed once per client company. */
export function buildMasterAgreement(companyName: string, company: CompanyDetails | null): AgreementDocument {
  return {
    version: AGREEMENT_VERSION,
    title: 'Employer of Record Services Agreement',
    parties: [`${ENSAAR_PARTY.legalName}, ${ENSAAR_PARTY.description} ("Ensaar").`, customerParty(companyName, company)],
    sections: [
      {
        heading: '1. What this agreement does',
        paragraphs: [
          'The Customer wants individuals to work for it in India. For each individual named in a Schedule A to this agreement signed by both parties (each an "Employee"), Ensaar will employ the Employee in India as the legal employer, and the Employee will perform services for the Customer. Ensaar provides this service in India only.',
          'This agreement starts on the date the Customer signs it (the "Effective Date"). Each Schedule A forms part of this agreement from the date both parties have signed it, and sets out that Employee\'s role, place of work, start date and how the Customer is charged for them. A change to any of those terms, including an Employee\'s pay, role or place of work, takes effect only through a new or amended Schedule A signed by both parties.',
          'Ensaar employs only individuals who already have the right to work in India. Visa, work permit and immigration support is not part of the services; if Ensaar agrees in writing to provide it, it is charged separately.',
        ],
      },
      {
        heading: '2. What Ensaar does',
        paragraphs: [
          `For each Employee, Ensaar will: issue a written offer letter and employment agreement that comply with Indian law and carry the Customer's confidentiality and intellectual property terms; run monthly payroll and pay salary in Indian rupees; deduct, file and pay the contributions and taxes that apply to Ensaar as employer, namely professional tax, income tax (TDS) and employees' state insurance where it applies; issue payslips and Form 16; maintain the statutory policies and registers an Indian employer must keep; and handle onboarding and lawful exit. Unless a Schedule A says otherwise, each Employee serves a probation period of ${PROBATION_MONTHS} months and either side may end employment on ${NOTICE_DAYS} days' notice, subject to Indian law.`,
          'Provident fund is not currently part of Ensaar\'s employment terms, because the Employees\' Provident Funds and Miscellaneous Provisions Act does not yet apply to Ensaar. Ensaar may offer provident fund at its discretion, and will register and contribute from the date the law requires it to (for example once Ensaar employs twenty or more people). From then on, the employer\'s provident fund contribution is an Employment Cost under clause 4.',
          'Before an Employee starts, Ensaar will verify their identity, PAN and right to work in India, and keep those records for audit. Ensaar will give the Customer copies of payslips, challans and filing acknowledgements on request.',
          'Ensaar will perform the services with reasonable skill and care and in line with the Indian law that applies to it as employer. Ensaar does not direct, supervise or review the Employees\' day-to-day work and is not responsible for the quality, timeliness or fitness for purpose of their work product. Apart from what this agreement states, Ensaar gives no other warranty about the services, and it does not give the Customer legal, tax or accounting advice.',
        ],
      },
      {
        heading: '3. What the Customer does',
        paragraphs: [
          'The Customer directs each Employee\'s day-to-day work, sets their tasks and reviews their output, and provides the accounts, tools and training the Employee needs for the work. The Customer will not ask an Employee to do anything unlawful, and will tell Ensaar promptly about any performance, conduct or safety concern so that Ensaar, as employer, can deal with it lawfully. Decisions about pay changes, discipline or ending an employment are made by Ensaar on the Customer\'s instruction, in line with Indian law.',
          `Only Ensaar, as employer, may discipline, suspend or dismiss an Employee. The Customer will not do so, and will not tell an Employee that their employment is ending. If the Customer has a concern about an Employee's conduct or performance, it will notify Ensaar in writing promptly, with the facts and any evidence. For performance, Ensaar will give the Employee a written warning and an improvement period of at least ${IMPROVEMENT_DAYS} days before ending the employment. For misconduct, Ensaar may remove the Employee from the Customer's work at once and will follow the notice and enquiry that Indian law requires; where serious misconduct is proven, Ensaar may dismiss without notice, and the notice and payment in lieu in clause 8 do not apply. The Customer will co-operate with the process, continues to pay the Monthly Charges until the employment lawfully ends, and indemnifies Ensaar against any claim caused by the Customer acting outside this clause.`,
          `The Customer will tell Ensaar in writing, by the ${PAYROLL_INPUT_DAY}th of each month, about anything that changes that month's pay: an approved bonus, allowance or expense, unpaid leave, or a last working day. Changes received later are included in the following month's payroll. Ensaar may run each month's payroll on the information it holds at that date.`,
          'Before an Employee starts, the Customer will tell Ensaar about any previous or current engagement it has with that individual, whether as an employee, contractor or consultant, and any amount still owed under it. The Customer is responsible for, and indemnifies Ensaar against, any claim arising from such an engagement.',
          'Any promise the Customer makes directly to an Employee, for example about a bonus, equity, a benefit or future employment, is the Customer\'s own commitment. The Customer will tell Ensaar about it in writing, will pay any cost of honouring it through Ensaar where it forms part of the Employee\'s pay, and indemnifies Ensaar against any claim arising from it.',
          'The Customer will complete Ensaar\'s know-your-business checks before the first Employee starts, keep the information it has given Ensaar current, and tell Ensaar promptly about any change of ownership, control or legal name.',
          'The Customer will not authorise any Employee to negotiate or conclude contracts in the Customer\'s name, and will not treat any place in India as its own fixed place of business, without first agreeing it with Ensaar in writing. This is to avoid creating a permanent establishment of the Customer in India. Responsibility for the Customer\'s own tax position remains with the Customer.',
        ],
      },
      {
        heading: '4. Fees and payment',
        paragraphs: [
          'Each Employee\'s Schedule A states how the Customer is charged for that Employee, in one of two ways. Under the first, the Customer pays Ensaar the monthly service fee stated in the Schedule A (the "Service Fee") and, in addition, the Employment Costs described below. Under the second, the Customer pays the single monthly amount stated in the Schedule A (the "Loaded Cost"). There is no setup fee and no minimum term. The Service Fee or Loaded Cost for a part month is pro-rated by calendar days.',
          `The Customer pays Ensaar a refundable deposit for an Employee, equal to one month's estimated Monthly Charges for that Employee (the "Deposit"), whenever Ensaar requires one. Whether to require a Deposit, and for which Employees, is at Ensaar's discretion, for example where the salary is high or an invoice has been paid late. Ensaar will require a Deposit either in the Employee's Schedule A, in which case it is payable before that Employee's start date and Ensaar is not obliged to employ the Employee until it is received, or later by written notice, in which case it is payable within ${PAYMENT_DAYS} days of the notice. Ensaar holds the Deposit without interest as security for the Customer's obligations and may apply it to any overdue amount; if it does, the Customer restores the Deposit within ${PAYMENT_DAYS} days of being asked. Ensaar refunds the Deposit, less anything the Customer owes, within 30 days after that Employee's arrangement has ended and the final invoice is paid.`,
          'The Customer also pays the Employment Costs of each Employee: gross salary and any bonus or allowance the Customer approves, the employer\'s statutory contributions that apply (employees\' state insurance where it applies, gratuity where it is payable, and provident fund from the date Ensaar offers it or the law requires it), and expenses the Customer approves. Employment Costs are passed through at cost, with no margin.',
          'A Loaded Cost is a fixed amount in US dollars that covers the Employee\'s gross salary, the employer\'s statutory contributions and Ensaar\'s fee for the month, and is not itemised. For an Employee on a Loaded Cost the Customer pays the Loaded Cost in place of the Service Fee and of those Employment Costs. The Loaded Cost does not cover any bonus or allowance the Customer approves, expenses the Customer approves, Asset Costs and the Procurement Fee, or the costs of a lawful exit under clause 8, which the Customer pays in addition at cost. A Loaded Cost changes only by a new Schedule A signed by both parties. In this agreement an Employee\'s "Monthly Charges" are the Service Fee and Employment Costs, or the Loaded Cost, whichever that Employee\'s Schedule A states.',
          `The Customer pays for every asset an Employee needs for the work, whether digital or physical, such as a laptop (each an "Asset"). If the Customer asks Ensaar to arrange the purchase of an Asset, the Customer reimburses Ensaar the full purchase price. Whether the Customer or Ensaar buys an Asset, the Customer also reimburses every cost Ensaar incurs in procuring, handling or shipping it, including shipping costs and any other administrative or miscellaneous cost. The purchase price Ensaar pays and those other costs are together the "Asset Costs". Asset Costs are not Employment Costs: in addition to reimbursing them, the Customer pays Ensaar a procurement fee of ${PROCUREMENT_FEE_PERCENT}% of the Asset Costs (the "Procurement Fee").`,
          `Ensaar will invoice in US dollars on the ${INVOICE_DAY}th of each month for that month's Monthly Charges, and for any Asset Costs and Procurement Fee incurred since the last invoice, converting rupee amounts at the rate on the invoice date. Each invoice is payable within ${PAYMENT_DAYS} days of its date, by bank transfer. Each party bears its own bank charges. The services are an export of services from India and are invoiced without Indian GST where the law allows.`,
          `Payment by the due date is essential: the Customer's payment funds each month's salaries and statutory dues for its Employees, and Ensaar is not obliged to extend credit to the Customer. Any amount not paid by its due date carries interest at ${LATE_INTEREST_PERCENT_PER_MONTH}% per month, calculated daily from the due date until it is paid, which Ensaar adds to the next invoice. While an invoice is overdue Ensaar may decline to take on new Employees, and may end this agreement or the arrangement for any Employee as clause 8 allows. The Customer bears every cost that results from its late payment or from that ending, including any amount Ensaar pays to meet its obligations as the Employees' employer, notice pay and other costs of a lawful exit, and any interest, penalty, damages or claim, and indemnifies Ensaar against them. The Customer also pays Ensaar's reasonable costs of recovering any overdue amount, including legal fees.`,
          'If the Customer disputes part of an invoice in good faith, it will tell Ensaar in writing before the due date, with its reasons, and pay the undisputed part on time. The parties will resolve the dispute promptly, and any amount found due carries interest from the original due date.',
        ],
      },
      {
        heading: '5. Intellectual property and confidentiality',
        paragraphs: [
          'Everything an Employee creates in the course of work for the Customer, including software, documents, designs and inventions, belongs to the Customer from the moment it is created. Ensaar assigns to the Customer, and will ensure each employment agreement assigns to Ensaar for onward assignment, all rights in that work, will procure that each Employee does not assert moral rights in it to the extent the law allows, and will sign any further document reasonably needed to record the Customer\'s ownership. Neither Ensaar nor any Employee acquires any right in the Customer\'s work, tools or information.',
          'Each party will keep the other\'s confidential information confidential, use it only for this agreement, and protect it with at least the care it uses for its own and never less than reasonable care. Confidential information does not include information that is or becomes public through no fault of the receiving party, that the receiving party already had or develops independently, or that it receives lawfully from someone else without a duty of confidence. A party may disclose confidential information where the law or a court requires it, after telling the other party where the law allows, and to its own advisers and staff who need it and are bound to keep it confidential. On request at the end of this agreement, each party will return or destroy the other\'s confidential information, except copies the law requires it to keep.',
          'Because a breach of this clause may cause harm that money cannot put right, the affected party may seek an injunction or other urgent relief from a court, in addition to any other remedy. This clause survives the end of this agreement.',
        ],
      },
      {
        heading: '6. Personal data',
        paragraphs: [
          'Ensaar processes each Employee\'s personal data as their employer, in line with India\'s Digital Personal Data Protection Act, 2023. It shares with the Customer only what the Customer needs to direct the work. The Customer will protect any personal data it receives, use it only for this engagement, and tell Ensaar promptly about any breach involving it.',
          'Where the Customer gives Ensaar personal data about a prospective or current Employee, the Customer confirms that it is entitled to do so, and that the individual has been told it will be shared with Ensaar for the purposes of their employment.',
        ],
      },
      {
        heading: '7. Compliance',
        paragraphs: [
          'Ensaar will comply with the Indian employment, payroll and tax laws that apply to it as employer. The Customer confirms that it, and anyone who owns or controls it, is not the subject of sanctions administered by the United States, the United Nations, the European Union, the United Kingdom or India, and that the engagement does not break any export control or sanctions law. Each party will comply with applicable anti-bribery laws.',
        ],
      },
      {
        heading: '8. Ending the agreement',
        paragraphs: [
          `Either party may end this agreement, or the arrangement for any one Employee, on ${NOTICE_DAYS} days' written notice. If the Customer wants an Employee's arrangement to end sooner than that, it pays in lieu of notice the Monthly Charges for the rest of the ${NOTICE_DAYS} days. Either party may end it immediately by notice if the other materially breaches it and does not fix the breach within 15 days of being told, or if an invoice remains unpaid 15 days after it was due.`,
          'Either party may also end this agreement immediately by notice if the other becomes insolvent, enters liquidation or administration, or stops carrying on business. Ensaar may end it immediately by notice if the Customer does not complete Ensaar\'s know-your-business checks to Ensaar\'s reasonable satisfaction, becomes subject to sanctions, or is involved in fraud, harassment or other unlawful conduct, or if a regulator or law enforcement authority requires it.',
          'When this agreement ends, the arrangement for every Employee ends with it. Ensaar will then end each Employee\'s employment lawfully, unless the Customer arranges, before the end date, to employ them directly or through another employer.',
          'When an Employee\'s arrangement ends, the Customer pays the Monthly Charges up to that Employee\'s last working day and, however that Employee is charged, all costs of a lawful exit, including notice pay, encashment of accrued leave and gratuity where it is payable. If the Customer wants to employ an Employee directly or through its own Indian entity, Ensaar will co-operate with the transfer and charges no conversion fee.',
          'Ending this agreement does not affect amounts already owed. Clauses 4 (for amounts owed), 5, 6, 8, 9 and 10 survive it.',
        ],
      },
      {
        heading: '9. Liability',
        paragraphs: [
          'Neither party is liable for indirect or consequential loss, or loss of profit. Apart from the Customer\'s obligation to pay invoices, each party\'s total liability under this agreement is limited to the Service Fees and Loaded Costs paid or payable in the 12 months before the claim. None of these limits applies to fraud, to breach of confidentiality, or to a party\'s liability for its own breach of law.',
          'The Customer indemnifies Ensaar against claims, penalties and costs arising from: the Customer\'s instructions to an Employee or its decisions about an Employee\'s hiring, work, pay, conduct or exit; the Customer\'s breach of this agreement; and any failure by the Customer to pay or reimburse an employment cost under this agreement. Ensaar indemnifies the Customer against penalties caused by Ensaar\'s failure to meet its statutory obligations as employer.',
          'A party seeking an indemnity will tell the other promptly in writing about the claim, give reasonable help with its defence at the other\'s cost, and not settle it without the other\'s consent, which will not be unreasonably withheld. An indemnity is reduced to the extent that the indemnified party caused or contributed to the loss.',
        ],
      },
      {
        heading: '10. General',
        paragraphs: [
          'This agreement is governed by the laws of India. Any dispute that the parties cannot settle within 30 days will be resolved by arbitration under the Arbitration and Conciliation Act, 1996, by a sole arbitrator, seated in Hyderabad, conducted in English. This agreement, with its Schedules, is the whole agreement on its subject. Except as the next paragraph allows, changes must be in writing and signed by both parties.',
          `Ensaar may revise this agreement from time to time. Ensaar will send the Customer the revised version in writing, by email or through the client portal, at least ${NOTICE_DAYS} days before it takes effect. If the Customer does not agree to a revision, it may end this agreement by written notice given before that date, and the revision does not apply during its notice period. If the Customer continues to use the services after that date without giving notice, the revised version applies from that date and replaces this one.`,
          'Notices under this agreement are given in writing by email: to Ensaar at its support address, and to the Customer at the signatory\'s and billing email addresses it has given Ensaar, or through the client portal. A notice is received when sent, unless the sender receives an error message.',
          'Neither party is liable for a delay or failure caused by events beyond its reasonable control, such as natural disaster, epidemic, war, civil unrest, government action or a failure of public utilities or networks, provided it tells the other promptly and does what it reasonably can to carry on. This does not excuse a delay in paying money. If such an event prevents performance for more than 30 days, either party may end this agreement by notice.',
          'The parties are independent contractors. Nothing in this agreement makes them partners, joint venturers, joint employers or agents of each other, and the Customer is not the employer of any Employee. Employees are not parties to this agreement and have no right to enforce it.',
          'The Customer may not transfer this agreement without Ensaar\'s written consent. Ensaar may transfer it to a company in its group or to a successor to its business, by notice to the Customer. During this agreement and for 12 months after it, the Customer will not solicit for employment any of Ensaar\'s own staff who worked on its account; this does not restrict the Customer from employing an Employee as clause 8 allows.',
          'If any part of this agreement is held unenforceable, the rest continues in force, and that part applies to the greatest extent the law allows. A failure or delay in exercising a right is not a waiver of it.',
          'The parties agree that this agreement and each Schedule may be signed electronically, and that an electronic signature has the same effect as a handwritten one under India\'s Information Technology Act, 2000 and the United States ESIGN Act.',
        ],
      },
    ],
    schedule: [],
  };
}

/**
 * One employee's Schedule A. It names the master agreement it belongs to by
 * version and fingerprint, so a schedule can never be read against a different
 * master text than the one the Customer signed.
 */
export function buildSchedule(input: {
  number: number;
  companyName: string;
  company: CompanyDetails | null;
  masterHash: string | null;
  employee: EmployeeInput;
}): AgreementDocument {
  const { employee } = input;
  const customer = input.company?.legalName || input.companyName;
  return {
    version: AGREEMENT_VERSION,
    title: `Schedule A-${input.number} to the Employer of Record Services Agreement`,
    parties: [`${ENSAAR_PARTY.legalName} ("Ensaar") and ${customer} (the "Customer").`],
    sections: [
      {
        heading: 'This Schedule',
        paragraphs: [
          `This Schedule A-${input.number} forms part of the Employer of Record Services Agreement between Ensaar and the Customer${input.masterHash ? ` (document fingerprint ${input.masterHash.slice(0, 16)})` : ''}, from the date both parties have signed it. The individual named below is an "Employee" under that agreement, on the terms below and otherwise on the terms of the agreement.`,
        ],
      },
    ],
    schedule: [
      // The legal name, as on the employee's PAN and Aadhaar, with the name the Customer knows them by.
      { label: 'Employee', value: employee.businessName ? `${employee.employeeName} (business name: ${employee.businessName})` : employee.employeeName },
      { label: 'Job title', value: employee.jobTitle },
      { label: 'Place of work', value: `${employee.workState}, India` },
      { label: 'Start date', value: formatDay(employee.startDate) },
      // Under a Loaded Cost the Schedule states one amount; the salary and the fee inside it are not the Customer's to see.
      ...(employee.pricing === 'loaded'
        ? [{ label: 'Loaded Cost', value: `${formatUsd(employee.loadedCostUsd ?? 0)} per month, covering salary, the employer's statutory contributions and Ensaar's fee` }]
        : [
            { label: 'Annual gross salary', value: `${formatInr(employee.salaryInr)} (Indian rupees)` },
            { label: 'Service Fee', value: `${formatUsd(employee.monthlyFeeUsd ?? 0)} per month` },
          ]),
      { label: 'Deposit', value: employee.depositRequired ? "Required: one month's Monthly Charges, refundable (clause 4)" : 'Not required at signing (clause 4)' },
      { label: 'Probation', value: `${PROBATION_MONTHS} months` },
      { label: 'Notice period', value: `${NOTICE_DAYS} days` },
    ],
  };
}

/** The canonical plain text, which is what is hashed and stored at signing. */
export function agreementToText(doc: AgreementDocument): string {
  return [
    doc.title.toUpperCase(),
    `Version ${doc.version}`,
    '',
    'BETWEEN',
    ...doc.parties,
    '',
    ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs, '']),
    ...(doc.schedule.length ? ['EMPLOYEE', ...doc.schedule.map((row) => `${row.label}: ${row.value}`)] : []),
  ].join('\n');
}
