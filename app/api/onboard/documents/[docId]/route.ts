import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/basecamp/audit';
import { isEditable } from '@/lib/eor/onboarding';
import { portalGate } from '@/lib/eor/portal';
import { deleteDocument } from '@/lib/eor/store';

export const runtime = 'nodejs';

/** Remove an uploaded document, until the agreement is signed. */
export async function DELETE(request: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const gate = await portalGate(request, 'write', 60);
  if (!gate.ok) return gate.response;
  if (!isEditable(gate.client.status)) {
    return NextResponse.json({ error: 'This onboarding is already signed.' }, { status: 409 });
  }
  const { docId } = await context.params;
  // Scoped to this client, so another customer's document id matches nothing.
  if (!(await deleteDocument(gate.client.id, docId))) {
    return NextResponse.json({ error: 'No such document.' }, { status: 404 });
  }
  await writeAudit({ actorEmail: gate.client.contactEmail, action: 'eor.document.delete', target: gate.client.id });
  return NextResponse.json({ ok: true });
}
