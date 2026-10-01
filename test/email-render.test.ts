import { describe, expect, it } from 'vitest';
import { renderEmail } from '@/lib/notify/outbox';

describe('renderEmail', () => {
  it('does not end a sentence twice after a name like "Inc."', () => {
    const { text, html } = renderEmail({ eyebrow: 'Test', heading: 'Hello', paragraphs: ['Ensaar works with Acme Inc.. Sign in.', 'Wait... then go.'] });
    expect(text).toContain('Acme Inc. Sign in.');
    expect(text).not.toContain('Inc..');
    expect(html).not.toContain('Inc..');
    expect(text).toContain('Wait... then go.');
  });
});
