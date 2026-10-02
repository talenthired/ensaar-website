import type { Metadata } from 'next';
import Link from 'next/link';
import { EmployeesTable } from '@/components/basecamp/EmployeesTable';

export const metadata: Metadata = {
  title: 'Employees - Basecamp',
  robots: { index: false, follow: false },
};

/** Every employee across every client, for operations. */
export default function BasecampEmployeesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Employees</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Everyone Ensaar employs or is about to, across all clients. Open a client to add employees or act on several at once.
        </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/basecamp/leave" className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-primary hover:bg-bg-tertiary">
            Leave
          </Link>
          <Link href="/basecamp/handbook" className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-primary hover:bg-bg-tertiary">
            Employee Handbook
          </Link>
          <Link href="/basecamp/holidays" className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-bg-primary px-3.5 py-2 text-sm text-ink-primary hover:bg-bg-tertiary">
            Holiday calendar
          </Link>
        </div>
      </header>
      <EmployeesTable />
    </div>
  );
}
