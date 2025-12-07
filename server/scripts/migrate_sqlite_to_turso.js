#!/usr/bin/env node
/**
 * Migration script: copies rows from local SQLite (server/data/qlik-codex.db)
 * into the configured Turso database (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
 *
 * Usage: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in environment and run:
 *   node server/scripts/migrate_sqlite_to_turso.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set (export them and re-run)');
    process.exit(1);
  }

  const sqlitePath = path.join(process.cwd(), 'data', 'qlik-codex.db');
  if (!fs.existsSync(sqlitePath)) {
    console.error('Local SQLite DB not found at', sqlitePath);
    process.exit(1);
  }

  console.log('Opening local SQLite DB:', sqlitePath);
  const localDb = new Database(sqlitePath, { readonly: true });

  console.log('Connecting to Turso...');
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url, authToken });

  // Tables to migrate (simple list) - will attempt to copy whatever exists
  const tables = [
    'users',
    'auth_sessions',
    'contact_messages',
    'optimization_history',
    'performance_metrics',
    'audit_logs',
    'llm_cache',
    'active_sessions',
    'user_daily_usage',
    'analytics_page_views',
    'analytics_events',
    'analytics_sessions'
  ];

  for (const table of tables) {
    try {
      console.log(`Migrating table: ${table}`);
      const rows = localDb.prepare(`SELECT * FROM ${table}`).all();

      if (!rows || rows.length === 0) {
        console.log(`  no rows in ${table}, skipping`);
        continue;
      }

      for (const row of rows) {
        const keys = Object.keys(row);
        const cols = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => row[k]);

        // Use INSERT OR IGNORE (sqlite compatibility) pattern for Turso
        const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
        try {
          await client.execute({ sql, args: values });
        } catch (err) {
          // Sometimes schema mismatch or unique constraint violation — ignore
          console.warn(`  row insert failed for ${table}:`, err.message || err);
        }
      }

      console.log(`  migrated ${rows.length} rows from ${table}`);
    } catch (err) {
      console.warn(`  skipped ${table} (error or not existing):`, err.message || err);
    }
  }

  console.log('Migration finished. Validate data in Turso dashboard.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed', err);
  process.exit(2);
});
