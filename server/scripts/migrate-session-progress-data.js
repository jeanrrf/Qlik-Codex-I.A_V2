/**
 * Database Migration Script
 * Removes NOT NULL constraint from active_sessions.progress_data column
 * 
 * Run this script to fix existing databases:
 * node server/scripts/migrate-session-progress-data.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'qlik-codex.db');

console.log('🔧 Starting database migration...');
console.log(`📂 Database path: ${DB_PATH}`);

try {
  const db = new Database(DB_PATH);

  console.log('✅ Database connection established');

  // Check if table exists
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='active_sessions'
  `).get();

  if (!tableCheck) {
    console.log('ℹ️  Table active_sessions does not exist yet. No migration needed.');
    process.exit(0);
  }

  console.log('📊 Found active_sessions table');

  // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
  console.log('🔄 Recreating table with nullable progress_data...');

  db.exec(`
    BEGIN TRANSACTION;
    
    -- Create new table with nullable progress_data
    CREATE TABLE active_sessions_new (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      mode TEXT NOT NULL,
      script TEXT NOT NULL,
      llm_provider TEXT,
      llm_model TEXT,
      progress_data TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    
    -- Copy data from old table (use empty object for NULL progress_data)
    INSERT INTO active_sessions_new
    SELECT 
      id, user_id, mode, script, llm_provider, llm_model,
      COALESCE(progress_data, '{}') as progress_data,
      status, created_at, updated_at, expires_at
    FROM active_sessions;
    
    -- Drop old table
    DROP TABLE active_sessions;
    
    -- Rename new table
    ALTER TABLE active_sessions_new RENAME TO active_sessions;
    
    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_session_user 
    ON active_sessions(user_id, updated_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_session_expires 
    ON active_sessions(expires_at);
    
    CREATE INDEX IF NOT EXISTS idx_session_status
    ON active_sessions(status, updated_at DESC);
    
    COMMIT;
  `);

  console.log('✅ Migration completed successfully!');
  console.log('📈 Table active_sessions now has nullable progress_data column');

  // Verify the change
  const count = db.prepare('SELECT COUNT(*) as count FROM active_sessions').get();
  console.log(`📊 Total sessions preserved: ${count.count}`);

  db.close();

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
