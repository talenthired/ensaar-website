import type { AgreementDocument } from '@/lib/eor/agreement';

export type SignatureBlock = {
  name: string | null;
  title: string | null;
  at: string | null;
  hash: string | null;
  version?: string | null;
  countersignedBy: string | null;
  countersignedAt: string | null;
};

function stamp(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
}

/**
 * The agreement as a readable, printable document.
 *
 * Before signing it renders the live draft. After signing, `signedText` is the
 * stored snapshot and is shown verbatim, because that text, not the current
 * template, is what the customer signed. `.agreement-print` is the only thing
 * that prints (see globals.css), so "Save as PDF" gives a clean copy.
 */
export function AgreementView({
  agreement,
  signedText,
  signature,
  customerName,
}: {
  agreement: AgreementDocument;
  signedText?: string | null;
  signature?: SignatureBlock | null;
  customerName: string;
}) {
  return (
    <article className="agreement-print rounded-xl border border-line-subtle bg-bg-primary p-6 text-sm leading-relaxed text-ink-primary md:p-8">
      {signedText ? (
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{signedText}</pre>
      ) : (
        <>
          <header className="text-center">
            <h2 className="text-lg font-semibold uppercase tracking-wide">{agreement.title}</h2>
            <p className="mt-1 text-xs text-ink-secondary">Version {agreement.version}</p>
          </header>
          <p className="mt-6 font-semibold">Between</p>
          {agreement.parties.map((party) => (
            <p key={party} className="mt-2">
              {party}
            </p>
          ))}
          {agreement.sections.map((section) => (
            <section key={section.heading} className="mt-6">
              <h3 className="font-semibold">{section.heading}</h3>
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)} className="mt-2">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <section className="mt-8">
            <h3 className="font-semibold">Schedule A: Employee</h3>
            <table className="mt-3 w-full border-collapse text-left">
              <tbody>
                {agreement.schedule.map((row) => (
                  <tr key={row.label} className="border-b border-line-subtle">
                    <th className="w-44 py-2 pr-4 font-medium text-ink-secondary">{row.label}</th>
                    <td className="py-2">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="mt-8 grid gap-6 border-t border-line-subtle pt-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-secondary">For {customerName}</p>
          {signature?.at ? (
            <>
              <p className="mt-2 font-serif text-xl italic">{signature.name}</p>
              <p className="text-xs text-ink-secondary">
                {signature.title} · signed electronically {stamp(signature.at)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-ink-secondary">Not yet signed</p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-secondary">For Ensaar Global Pvt. Ltd.</p>
          {signature?.countersignedAt ? (
            <>
              <p className="mt-2 font-serif text-xl italic">{signature.countersignedBy}</p>
              <p className="text-xs text-ink-secondary">countersigned electronically {stamp(signature.countersignedAt)}</p>
            </>
          ) : (
            <p className="mt-2 text-ink-secondary">Countersigned after Ensaar reviews your documents</p>
          )}
        </div>
      </section>
      {signature?.hash && (
        <p className="mt-6 break-all text-[11px] text-ink-secondary">
          Document fingerprint (SHA-256): {signature.hash}
        </p>
      )}
    </article>
  );
}
