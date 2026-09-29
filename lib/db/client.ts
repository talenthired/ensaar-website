import 'server-only';

import postgres from 'postgres';

/**
 * The durable store for Basecamp.
 *
 * Three backends existed before this file, chosen per store: a local JSON file in
 * development, Supabase REST in production, and an in-memory map for sessions.
 * Postgres becomes the durable one when DATABASE_URL is set, and the existing
 * branches stay exactly as they were so nothing that works today stops working:
 *
 *   DATABASE_URL set        -> Postgres (this file)
 *   else SUPABASE_URL set   -> Supabase REST (unchanged)
 *   else                    -> local file / memory, development only
 *
 * The client is a lazy singleton because Next re-imports modules per route in
 * development and a connection pool per import would exhaust Postgres in minutes.
 */
let client: postgres.Sql | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  if (!client) {
    client = postgres(url, {
      // Railway terminates TLS at the proxy and the internal network is private;
      // require: true would fail on the internal host, which has no certificate.
      ssl: url.includes('localhost') || url.includes('127.0.0.1') || url.includes('.railway.internal')
        ? false
        : 'prefer',
      // A web dyno serves many short requests; a small pool avoids idle
      // connections piling up against Postgres's default max_connections.
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      // Dates come back as ISO strings everywhere else in this codebase
      // (Supabase REST returns JSON), so keep one representation.
      transform: { undefined: null },
    });
  }
  return client;
}

/**
 * Postgres is required for any write once the app is deployed. Reads still fall
 * back, so a misconfigured deploy degrades to the seeded public content rather
 * than a blank site, but a write that silently vanished would be worse than an
 * error the operator can see.
 */
export function requireDatabase(): postgres.Sql {
  if (!hasDatabase()) {
    throw new Error(
      'DATABASE_URL is required for Basecamp writes. Attach the Postgres service and redeploy.',
    );
  }
  return db();
}
