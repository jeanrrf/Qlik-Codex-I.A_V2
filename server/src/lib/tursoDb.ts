/**
 * Turso Database Client - SQLite na Cloud (Cloudflare)
 * Alternativa simples ao Supabase/PostgreSQL
 */

import type { Client } from '@libsql/client';
import { logger } from './logger';

let tursoClient: Client | null = null;

/**
 * Inicializa cliente Turso
 */
export async function initTursoDb(): Promise<Client> {
  if (tursoClient) {
    return tursoClient;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    logger.warn('Turso configuration missing - ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in production');
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  }

  const { createClient } = await import('@libsql/client');

  tursoClient = createClient({
    url,
    authToken
  });

  logger.info('Turso database initialized (URL present, token available)');

  // Criar tabelas
  createTables().catch(err => {
    logger.error('Error creating Turso tables', err);
  });

  return tursoClient;
}

/**
 * Cria tabelas se não existirem
 */
async function createTables() {
  if (!tursoClient) return;

  try {
    // Tabela de page views
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS analytics_page_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        session_id TEXT,
        page TEXT NOT NULL,
        referrer TEXT,
        ip TEXT,
        user_agent TEXT,
        is_owner INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_analytics_pv_page 
      ON analytics_page_views(page, timestamp DESC);
    `);

    // Tabela de events
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        session_id TEXT,
        event_type TEXT NOT NULL,
        event_category TEXT NOT NULL,
        event_label TEXT,
        event_value INTEGER,
        is_owner INTEGER NOT NULL DEFAULT 0,
        metadata TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_analytics_ev_type 
      ON analytics_events(event_type, timestamp DESC);
    `);

    // Tabela de sessions
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        ip TEXT,
        user_agent TEXT,
        is_owner INTEGER NOT NULL DEFAULT 0,
        landing_page TEXT,
        page_count INTEGER NOT NULL DEFAULT 0,
        event_count INTEGER NOT NULL DEFAULT 0,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_analytics_sess_id 
      ON analytics_sessions(session_id);
    `);

    // We'll create all tables used by the app (mirror of sqlite schema)
    // Contact messages
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        company TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_contact_created 
      ON contact_messages(created_at DESC);
    `);

    // Optimization history
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS optimization_history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        mode TEXT NOT NULL,
        original_lines INTEGER NOT NULL,
        optimized_lines INTEGER,
        breaking_risk TEXT,
        changes_count INTEGER,
        duration_ms INTEGER,
        llm_provider TEXT,
        success INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_opt_created 
      ON optimization_history(created_at DESC);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_opt_user 
      ON optimization_history(user_id, created_at DESC);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_opt_success
      ON optimization_history(success, created_at DESC);
    `);

    // Performance metrics
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        optimization_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_metrics_opt 
      ON performance_metrics(optimization_id);
    `);

    // Audit logs
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        user_id TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_entity 
      ON audit_logs(entity_type, entity_id);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_audit_created 
      ON audit_logs(created_at DESC);
    `);

    // LLM cache
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS llm_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_hash TEXT UNIQUE NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        tokens_used INTEGER,
        duration_ms INTEGER,
        created_at TEXT NOT NULL,
        accessed_at TEXT NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 1
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_cache_hash 
      ON llm_cache(prompt_hash);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_cache_accessed 
      ON llm_cache(accessed_at DESC);
    `);

    // Active sessions
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        mode TEXT NOT NULL,
        llm_provider TEXT,
        llm_model TEXT,
        progress_data TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_session_user 
      ON active_sessions(user_id, updated_at DESC);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_session_expires 
      ON active_sessions(expires_at);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_session_status
      ON active_sessions(status, updated_at DESC);
    `);

    // Users
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        google_id TEXT UNIQUE,
        avatar_url TEXT,
        created_at TEXT NOT NULL,
        last_login TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_email 
      ON users(email);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_google 
      ON users(google_id);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_user_role
      ON users(role, is_active);
    `);

    // Auth sessions / tokens
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        refresh_token TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_activity TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_auth_token 
      ON auth_sessions(token);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_auth_user 
      ON auth_sessions(user_id, last_activity DESC);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_auth_expires 
      ON auth_sessions(expires_at);
    `);

    // User daily usage / quota
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS user_daily_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        executed_at TEXT NOT NULL
      );
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_usage_user_date 
      ON user_daily_usage(user_id, executed_at DESC);
    `);

    await tursoClient.execute(`
      CREATE INDEX IF NOT EXISTS idx_usage_mode 
      ON user_daily_usage(mode, executed_at DESC);
    `);

    logger.info('Turso tables created successfully');
  } catch (err) {
    logger.error('Error creating Turso tables', err);
  }
}

/**
 * Obtém cliente Turso
 */
export function getTursoDb(): Client {
  if (!tursoClient) {
    throw new Error('Turso client not initialized. Call initTursoDb() first.');
  }
  return tursoClient;
}

/**
 * Wrapper compatível com better-sqlite3 para uso transparente
 */
export class TursoSqliteWrapper {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Prepare statement (compatibilidade com better-sqlite3)
   */
  prepare(sql: string) {
    const client = this.client;

    return {
      get: async (...params: any[]) => {
        try {
          const result = await client.execute({ sql, args: params });
          return result.rows[0] || null;
        } catch (err) {
          logger.error('Turso query error (get)', { sql, params, error: err });
          throw err;
        }
      },

      all: async (...params: any[]) => {
        try {
          const result = await client.execute({ sql, args: params });
          return result.rows;
        } catch (err) {
          logger.error('Turso query error (all)', { sql, params, error: err });
          throw err;
        }
      },

      run: async (...params: any[]) => {
        try {
          await client.execute({ sql, args: params });
        } catch (err) {
          logger.error('Turso query error (run)', { sql, params, error: err });
          throw err;
        }
      }
    };
  }

  /**
   * Executa SQL direto (compatibilidade)
   */
  async exec(sql: string): Promise<void> {
    try {
      await this.client.execute(sql);
    } catch (err) {
      logger.error('Turso exec error', { sql, error: err });
      throw err;
    }
  }
}
