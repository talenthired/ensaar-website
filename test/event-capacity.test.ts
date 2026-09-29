import { describe, expect, it } from 'vitest';
import { parseEventInput } from '@/lib/events/validate';
import { registrationsToCsv } from '@/lib/events/registrations';
import type { Registration } from '@/lib/events/registration-types';

const base = {
  title: 'AI Enablement Clinic',
  date: '2026-12-01',
  type: 'workshop',
  location: 'Online',
  summary: 'Hands-on session.',
};

/**
 * Capacity was added after the validator existed, and the validator drops
 * anything it does not name. The field round-tripped through the API and was
 * silently discarded, so an event with "2 seats" accepted unlimited
 * registrations. These assert the field survives parsing and that a bad value is
 * reported rather than ignored.
 */
describe('event capacity parsing', () => {
  it('keeps a valid capacity', () => {
    const parsed = parseEventInput({ ...base, capacity: 25 });
    expect(typeof parsed === 'string' ? parsed : parsed.capacity).toBe(25);
  });

  it('accepts a numeric string from a form field', () => {
    const parsed = parseEventInput({ ...base, capacity: '40' });
    expect(typeof parsed === 'string' ? parsed : parsed.capacity).toBe(40);
  });

  it('treats an empty value as unlimited rather than zero', () => {
    const parsed = parseEventInput({ ...base, capacity: '' });
    expect(typeof parsed === 'string' ? parsed : parsed.capacity).toBeNull();
  });

  it('leaves capacity untouched when the field is absent', () => {
    const parsed = parseEventInput({ ...base });
    expect(typeof parsed === 'string' ? 'error' : 'capacity' in parsed).toBe(false);
  });

  it('rejects nonsense instead of dropping it', () => {
    for (const bad of [-1, 0, 2.5, 'many', 100001]) {
      expect(typeof parseEventInput({ ...base, capacity: bad }), String(bad)).toBe('string');
    }
  });
});

describe('registration CSV', () => {
  const row = (over: Partial<Registration>): Registration => ({
    id: 'r1',
    eventId: 'e1',
    name: 'Asha',
    email: 'asha@corp.com',
    company: null,
    phone: null,
    notes: null,
    status: 'registered',
    source: null,
    createdAt: '2026-08-16T10:00:00.000Z',
    ...over,
  });

  it('quotes a field containing a comma so columns do not shift', () => {
    const csv = registrationsToCsv([row({ company: 'Acme, Inc' })]);
    expect(csv.split('\n')[1]).toContain('"Acme, Inc"');
    expect(csv.split('\n')[1]!.split('","').length).toBe(7);
  });

  it('escapes embedded quotes per RFC 4180', () => {
    const csv = registrationsToCsv([row({ name: 'The "Boss"' })]);
    expect(csv).toContain('"The ""Boss"""');
  });

  it('writes a header even with no rows', () => {
    expect(registrationsToCsv([])).toBe('name,email,company,phone,status,registered_at,notes');
  });
});
