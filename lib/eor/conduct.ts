/**
 * Corrective action, as the Employee Handbook (section 14) sets it out: an
 * informal word, then a verbal warning, a written warning, a final written
 * warning, and ending employment; with a show-cause letter and suspension on
 * pay for serious matters. Pure and shared, so the rules are tested and the
 * screens agree with the server.
 *
 * Only Ensaar acts, never the client. Before ending someone's employment the
 * employee must have been told in writing and had a chance to respond
 * (employment agreement clause 13): canTerminate enforces it.
 */

import { ENSAAR_PARTY } from './agreement';
import { formatDay } from './onboarding';

export const CONDUCT_REASONS = { performance: 'Performance', attendance: 'Attendance or unreported absence', conduct: 'Conduct' } as const;
export type ConductReason = keyof typeof CONDUCT_REASONS;

/** What can happen in a case. Letters go to the employee; notes and reports stay with Ensaar. */
export const CONDUCT_STEPS = {
  client_report: { label: 'Concern raised by the client', letter: false },
  note: { label: 'Note', letter: false },
  verbal_warning: { label: 'Verbal warning (noted on file)', letter: false },
  written_warning: { label: 'Written warning', letter: true },
  final_warning: { label: 'Final written warning', letter: true },
  show_cause: { label: 'Show-cause letter', letter: true },
  suspension: { label: 'Suspension on pay pending a decision', letter: true },
  abandonment: { label: 'Letter about unreported absence', letter: true },
  termination: { label: 'Termination letter', letter: true },
  closed: { label: 'Case closed', letter: false },
} as const;
export type ConductStep = keyof typeof CONDUCT_STEPS;
export type LetterStep = { [K in ConductStep]: (typeof CONDUCT_STEPS)[K]['letter'] extends true ? K : never }[ConductStep];
export const isLetterStep = (s: unknown): s is LetterStep => typeof s === 'string' && s in CONDUCT_STEPS && CONDUCT_STEPS[s as ConductStep].letter;

/** Steps that ask the employee to reply by a date. */
export const NEEDS_REPLY: readonly ConductStep[] = ['show_cause', 'abandonment'];
/** Working days given to reply, unless Ensaar gives longer. */
export const REPLY_DAYS = 3;

export type ConductEvent = { step: ConductStep; issuedAt: string; responseDue: string | null; repliedAt: string | null };

/**
 * Whether Ensaar may now end the employment: after a final written warning, or
 * after a show-cause (or absence) letter that the employee answered or let pass.
 */
export function canTerminate(events: ConductEvent[], today: string): { ok: true } | { ok: false; reason: string } {
  if (events.some((e) => e.step === 'final_warning')) return { ok: true };
  const asked = events.filter((e) => NEEDS_REPLY.includes(e.step));
  if (asked.some((e) => e.repliedAt || (e.responseDue && e.responseDue < today))) return { ok: true };
  if (asked.length) return { ok: false, reason: `Wait for the employee's reply, or until ${formatDay(asked.at(-1)!.responseDue ?? today)} has passed.` };
  return { ok: false, reason: 'Before ending employment, issue a final written warning, or a show-cause letter and give the employee the chance to reply.' };
}

export type LetterInput = {
  step: LetterStep;
  employeeName: string;
  employeeEmail: string;
  jobTitle: string;
  companyName: string;
  issuedOn: string;
  /** What happened, or the concern, in Ensaar's words. */
  details: string;
  /** For warnings: what must change. */
  expectation?: string | null;
  /** Reply by (show-cause, absence) or review date (warnings), YYYY-MM-DD. */
  dueDate?: string | null;
  /** For termination: the last working day, and whether notice is paid in lieu or the dismissal is for serious misconduct. */
  lastDay?: string | null;
  basis?: 'notice' | 'pay_in_lieu' | 'serious_misconduct' | null;
  signatory: string;
};

const TITLES: Record<LetterStep, string> = {
  written_warning: 'Written warning',
  final_warning: 'Final written warning',
  show_cause: 'Show-cause notice',
  suspension: 'Suspension pending a decision',
  abandonment: 'Unreported absence from work',
  termination: 'Termination of employment',
};

/** The letter as frozen text: what is fingerprinted, emailed as a PDF and shown in the portal. */
export function conductLetterText(input: LetterInput): string {
  const due = input.dueDate ? formatDay(input.dueDate) : null;
  const body: string[] = [];
  switch (input.step) {
    case 'written_warning':
    case 'final_warning':
      body.push(
        `This is a ${input.step === 'final_warning' ? 'final written warning' : 'written warning'} under section 14 of the Ensaar Employee Handbook.`,
        `What happened: ${input.details}`,
        ...(input.expectation ? [`What needs to change: ${input.expectation}`] : []),
        due ? `Ensaar will review this with you on or after ${due}.` : 'Ensaar will review this with you.',
        input.step === 'final_warning'
          ? 'If the issue continues or happens again, Ensaar may end your employment, as your employment agreement and the handbook set out.'
          : 'If the issue continues, Ensaar may issue a final written warning.',
        'If you disagree with anything in this letter, reply in the employee portal; your reply is kept with this letter.',
      );
      break;
    case 'show_cause':
      body.push(
        'Ensaar has received information that, if true, would be a serious breach of your obligations. Before deciding anything, Ensaar wants your account.',
        `What is alleged: ${input.details}`,
        `Please explain in writing, in the employee portal, why Ensaar should not take disciplinary action, by ${due}. You may include any evidence you want Ensaar to consider. If you do not reply by then, Ensaar will decide on the information it has.`,
        'No decision has been made. Please keep this matter confidential while it is looked into.',
      );
      break;
    case 'suspension':
      body.push(
        'While Ensaar looks into the matter below, you are suspended from work on full pay, with immediate effect. This is not a disciplinary penalty and no decision has been made.',
        `The matter: ${input.details}`,
        'During the suspension, please do not access the Client\'s systems or contact the Client\'s team about work, and stay reachable by email and phone. Ensaar will tell you in writing when the suspension ends.',
      );
      break;
    case 'abandonment':
      body.push(
        `You have been absent from work without contacting Ensaar or your Client manager: ${input.details}`,
        `Please contact ${ENSAAR_PARTY.legalName} at hr@ensaar.com, or reply in the employee portal, by ${due}, to explain your absence. If you do not, Ensaar may treat your employment as abandoned and end it, as section 9 of the Employee Handbook explains.`,
        'If you are unwell or something has happened, we want to help: please get in touch.',
      );
      break;
    case 'termination': {
      const last = input.lastDay ? formatDay(input.lastDay) : formatDay(input.issuedOn);
      body.push(
        input.basis === 'serious_misconduct'
          ? `Ensaar has decided to end your employment for serious misconduct, without notice, with effect from ${last}.`
          : input.basis === 'pay_in_lieu'
            ? `Ensaar has decided to end your employment. Your employment ends on ${last}, and you will be paid in place of your notice period.`
            : `Ensaar is giving you notice that your employment will end. Your last working day is ${last}.`,
        `The reasons: ${input.details}`,
        'Before deciding, Ensaar told you in writing what the concern was and considered any response you gave.',
        'Please return all equipment, documents and access belonging to Ensaar or the Client by your last day. Ensaar will pay your final settlement (salary to your last day, unused leave and anything else due, less lawful deductions) within two working days of your last day, and give you a relieving letter.',
      );
      break;
    }
  }
  return [
    TITLES[input.step].toUpperCase(),
    '',
    `Date: ${formatDay(input.issuedOn)}`,
    `To: ${input.employeeName} <${input.employeeEmail}>`,
    `Role: ${input.jobTitle}, working with ${input.companyName}`,
    '',
    ...body,
    '',
    `For ${ENSAAR_PARTY.legalName}`,
    input.signatory,
  ].join('\n');
}

export const CONDUCT_TITLES = TITLES;
