/**
 * Registration shapes shared by the server store and the admin/public UI.
 *
 * Deliberately free of 'server-only' and of any node import: the client bundle
 * needs the status vocabulary to render the filter and the badges, and importing
 * the store for it would drag the database driver into the browser build.
 */

export const REGISTRATION_STATUSES = ['registered', 'waitlisted', 'cancelled', 'attended'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export type Registration = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string | null;
  status: RegistrationStatus;
  source: string | null;
  createdAt: string;
};

export function isRegistrationStatus(value: unknown): value is RegistrationStatus {
  return typeof value === 'string' && (REGISTRATION_STATUSES as readonly string[]).includes(value);
}
