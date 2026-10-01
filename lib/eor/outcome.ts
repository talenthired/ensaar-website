/** What a store operation returns: the value, or why it was refused and with which HTTP status. */
/** `changed`: the text moved under the user. `missing`: a needed document has not arrived (staff may confirm and go on). */
export type Refusal = { ok: false; status: number; error: string; changed?: boolean; missing?: boolean };
export type Outcome<T> = { ok: true; value: T } | Refusal;

export const refuse = (status: number, error: string, extra: Partial<Refusal> = {}): Refusal => ({ ok: false, status, error, ...extra });
export const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export function pageArgs(input: { page?: unknown; pageSize?: unknown }, fallbackSize = 25) {
  const pageSize = Math.min(Math.max(Number(input.pageSize) || fallbackSize, 5), 100);
  const page = Math.max(Math.floor(Number(input.page) || 1), 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Escape a user search term for ILIKE. */
export function likePattern(q: string | null | undefined): string | null {
  const term = q?.trim().slice(0, 100);
  return term ? `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
}
