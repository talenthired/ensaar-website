/**
 * The beneficial ownership declaration: who owns or controls 25% or more of a
 * client company, or, if nobody does, who controls it. Pure validation and the
 * text that is signed (no 'server-only'), shared by the portal form and the
 * server that stores it.
 */

import { OWNERSHIP_THRESHOLD_PERCENT } from './outstanding';

export type Owner = { fullName: string; dateOfBirth: string; country: string; percent: number };
export type Controller = { fullName: string; title: string };
export type OwnershipInput = { owners: Owner[]; noLargeOwner: boolean; controller: Controller | null };

/** At most four people can each hold 25% or more. */
export const MAX_OWNERS = 4;

type Errors = Record<string, string>;
const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

export function validateOwnership(input: unknown, now = new Date()): { ok: true; value: OwnershipInput } | { ok: false; errors: Errors } {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: Errors = {};
  const noLargeOwner = body.noLargeOwner === true;
  const rawOwners = Array.isArray(body.owners) ? body.owners.slice(0, MAX_OWNERS + 1) : [];
  const owners: Owner[] = [];
  if (!noLargeOwner) {
    if (rawOwners.length === 0) errors.owners = `Add each person who owns or controls ${OWNERSHIP_THRESHOLD_PERCENT}% or more, or tick that nobody does.`;
    if (rawOwners.length > MAX_OWNERS) errors.owners = `At most ${MAX_OWNERS} people can each own ${OWNERSHIP_THRESHOLD_PERCENT}% or more.`;
    rawOwners.slice(0, MAX_OWNERS).forEach((raw, i) => {
      const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const fullName = str(o.fullName);
      const dateOfBirth = str(o.dateOfBirth, 10);
      const country = str(o.country, 60);
      const percent = Number(String(o.percent ?? '').replace(/[%\s]/g, ''));
      const born = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? new Date(`${dateOfBirth}T00:00:00Z`) : null;
      if (fullName.length < 3) errors[`owners.${i}.fullName`] = 'Enter their full legal name.';
      if (!born || Number.isNaN(born.getTime()) || born.toISOString().slice(0, 10) !== dateOfBirth || born > now || born.getUTCFullYear() < 1900) {
        errors[`owners.${i}.dateOfBirth`] = 'Enter their date of birth.';
      }
      if (country.length < 2) errors[`owners.${i}.country`] = 'Enter the country they live in.';
      if (!Number.isFinite(percent) || percent < OWNERSHIP_THRESHOLD_PERCENT || percent > 100) {
        errors[`owners.${i}.percent`] = `Enter their share, from ${OWNERSHIP_THRESHOLD_PERCENT} to 100.`;
      }
      owners.push({ fullName, dateOfBirth, country, percent: Math.round(percent * 100) / 100 });
    });
    if (owners.reduce((s, o) => s + (Number.isFinite(o.percent) ? o.percent : 0), 0) > 100.0001) errors.owners = 'The shares add up to more than 100%.';
  }
  let controller: Controller | null = null;
  if (noLargeOwner) {
    const c = (body.controller && typeof body.controller === 'object' ? body.controller : {}) as Record<string, unknown>;
    controller = { fullName: str(c.fullName), title: str(c.title) };
    if (controller.fullName.length < 3) errors['controller.fullName'] = 'Enter the full name of the person who controls the company.';
    if (controller.title.length < 2) errors['controller.title'] = 'Enter their title, for example Managing Member.';
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { owners: noLargeOwner ? [] : owners, noLargeOwner, controller } };
}

/** The declaration exactly as signed: stored, fingerprinted and shown back. */
export function ownershipText(companyName: string, d: OwnershipInput, signer: { name: string; email: string }, date: string): string {
  return [
    'BENEFICIAL OWNERSHIP DECLARATION',
    '',
    `Company: ${companyName}`,
    '',
    d.noLargeOwner
      ? `No individual owns or controls ${OWNERSHIP_THRESHOLD_PERCENT}% or more of the company. The individual with significant control over it is: ${d.controller!.fullName}, ${d.controller!.title}.`
      : `Each individual who owns or controls ${OWNERSHIP_THRESHOLD_PERCENT}% or more of the company:`,
    ...d.owners.map((o) => `- ${o.fullName}, born ${o.dateOfBirth}, lives in ${o.country}, ${o.percent}%`),
    '',
    `I confirm this is true and complete, and that I am authorised to make this declaration for the company. The company will tell Ensaar Global Private Limited within 30 days if it changes.`,
    '',
    `Declared by ${signer.name} <${signer.email}> on ${date}.`,
  ].join('\n');
}
