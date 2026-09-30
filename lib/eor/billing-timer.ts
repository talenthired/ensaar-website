import 'server-only';

import { hasDatabase } from '@/lib/db/client';
import { billingTick } from './invoices';

const EVERY_MS = 10 * 60 * 1000;
const FIRST_RUN_MS = 30 * 1000;

/**
 * Queue invoice reminders and deliver due email every few minutes.
 *
 * In-process on purpose: the site is one long-running Node server, and every
 * reminder has a dedupe key in the outbox, so a second instance or a restart
 * mid-run cannot send anything twice.
 */
export function startBillingTimer(): void {
  if (!hasDatabase() || process.env.NEXT_PHASE === 'phase-production-build') return;
  const state = globalThis as { __ensaarBillingTimer?: boolean };
  if (state.__ensaarBillingTimer) return;
  state.__ensaarBillingTimer = true;

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await billingTick();
    } catch (error) {
      console.error('Billing reminders failed', error);
    } finally {
      running = false;
    }
  };
  setTimeout(() => void tick(), FIRST_RUN_MS).unref();
  setInterval(() => void tick(), EVERY_MS).unref();
}
