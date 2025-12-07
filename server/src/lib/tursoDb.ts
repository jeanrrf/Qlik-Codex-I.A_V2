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
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  }

  const { createClient } = await import('@libsql/client');

  tursoClient = createClient({
    url,
    authToken
  });

  logger.info('Turso database initialized');

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
