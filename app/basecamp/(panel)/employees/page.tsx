import type { Metadata } from 'next';
import { EmployeesTable } from '@/components/basecamp/EmployeesTable';

export const metadata: Metadata = {
  title: 'Employees - Basecamp',
  robots: { index: false, follow: false },
};

/** Every employee across every client, for operations. */
export default function BasecampEmployeesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink-primary">Employees</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Everyone Ensaar employs or is about to, across all clients. Open a client to add employees or act on several at once.
        </p>
      </header>
      <EmployeesTable />
    </div>
  );
}
