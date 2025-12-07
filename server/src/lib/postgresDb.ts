/**
 * PostgreSQL Database - Alternativa para produção (Render/Cloud)
 * Substitui SQLite para ambientes com filesystem efêmero
 */

import { Pool } from 'pg';

import { logger } from './logger';

let pool: Pool | null = null;

/**
 * Inicializa conexão PostgreSQL
 */
export function initPostgresDb(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  logger.info('PostgreSQL database initialized');

  // Criar tabelas
  createTables();

  return pool;
}

/**
 * Cria tabelas se não existirem
 */
async function createTables() {
  if (!pool) throw new Error('Database not initialized');

  try {
    // Tabela de page views
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_page_views (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        page TEXT NOT NULL,
        referrer TEXT,
        ip TEXT,
        user_agent TEXT,
        is_owner BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analytics_pv_page ON analytics_page_views(page, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_pv_owner ON analytics_page_views(is_owner, timestamp DESC);
    `);

    // Tabela de events
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        session_id TEXT,
        event_type TEXT NOT NULL,
        event_category TEXT NOT NULL,
        event_label TEXT,
        event_value INTEGER,
        is_owner BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analytics_ev_type ON analytics_events(event_type, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_analytics_ev_owner ON analytics_events(is_owner, timestamp DESC);
    `);

    // Tabela de sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        id SERIAL PRIMARY KEY,
        session_id TEXT UNIQUE NOT NULL,
        user_id TEXT,
        ip TEXT,
        user_agent TEXT,
        is_owner BOOLEAN NOT NULL DEFAULT FALSE,
        landing_page TEXT,
        page_count INTEGER NOT NULL DEFAULT 0,
        event_count INTEGER NOT NULL DEFAULT 0,
        start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_analytics_sess_id ON analytics_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_sess_owner ON analytics_sessions(is_owner, start_time DESC);
    `);

    logger.info('PostgreSQL tables created successfully');
  } catch (err) {
    logger.error('Error creating PostgreSQL tables', err);
    throw err;
  }
}

/**
 * Obtém instância do pool
 */
export function getPostgresDb(): Pool {
  if (!pool) {
    return initPostgresDb();
  }
  return pool;
}

/**
 * Fecha conexão
 */
export async function closePostgresDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('PostgreSQL connection closed');
  }
}
