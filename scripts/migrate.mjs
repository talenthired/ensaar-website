// Apply lib/db/schema.sql. Idempotent, so it runs on every deploy.
//
// No migration ledger on purpose: the schema file is written with IF NOT EXISTS
// throughout, which keeps deploys a single statement and avoids a half-applied
// ledger row after a failed release. Changes to the schema must stay additive.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set; nothing to migrate.');
  process.exit(process.env.MIGRATE_OPTIONAL === '1' ? 0 : 1);
}

const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
const schema = await readFile(schemaPath, 'utf8');
const sql = postgres(url, {
  ssl:
    url.includes('localhost') || url.includes('127.0.0.1') || url.includes('.railway.internal')
      ? false
      : 'prefer',
  max: 1,
});

try {
  await sql.unsafe(schema);
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'ensaar_%'
  `;
  console.log(`schema applied; ${count} ensaar_* tables present`);
} catch (error) {
  console.error('migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
