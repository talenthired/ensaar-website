import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

describe('DailyByte support bridge', () => {
  it('keeps the bridge secret in the server route and out of the client component', () => {
    const route = readFileSync(resolve(root, 'app/api/support/route.ts'), 'utf8');
    const client = readFileSync(resolve(root, 'components/marketing/EnsaarLiveSupport.tsx'), 'utf8');
    expect(route).toContain('process.env.SUPPORT_BRIDGE_SECRET');
    expect(route).toContain("'x-support-bridge-secret': secret");
    expect(client).not.toContain('SUPPORT_BRIDGE_SECRET');
    expect(client).not.toContain('DAILYBYTE_SUPPORT_API_URL');
  });

  it('hides the live support entry until the server bridge is configured', () => {
    const layout = readFileSync(resolve(root, 'app/layout.tsx'), 'utf8');
    const advisor = readFileSync(resolve(root, 'components/marketing/OpportunityAdvisor.tsx'), 'utf8');
    expect(layout).toContain('liveSupportEnabled={Boolean(process.env.SUPPORT_BRIDGE_SECRET?.trim())}');
    expect(advisor).toContain('{liveSupportEnabled && (');
  });

  it('bounds public support fields before forwarding them', () => {
    const route = readFileSync(resolve(root, 'app/api/support/route.ts'), 'utf8');
    expect(route).toContain('clean(body.body, 4000)');
    expect(route).toContain('clean(body.email, 254)');
    expect(route).toContain("clientKey(request, 'support-chat')");
  });
});
