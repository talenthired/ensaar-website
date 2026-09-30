/**
 * Runs once when the server starts. Starts the background job that sends
 * invoice reminders and retries undelivered email, so neither depends on
 * someone happening to open Basecamp.
 */
export async function register() {
  // The import must sit inside this check: the file is also compiled for the
  // edge runtime (middleware), where the database driver cannot load.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startBillingTimer } = await import('./lib/eor/billing-timer');
    startBillingTimer();
  }
}
