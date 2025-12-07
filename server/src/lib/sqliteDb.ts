/**
 * Qlik Codex I.A - SQLite Database
 * Banco de dados local para armazenar histórico, métricas e logs
 */

import fs from "fs";
import path from "path";

import Database from "better-sqlite3";

import { logger } from "./logger";

let db: Database.Database | null = null;

export function initSqliteDb(): Database.Database {
  if (db) {
    return db;
  }

  // Criar pasta data se não existir
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "qlik-codex.db");

  try {
    db = new Database(dbPath);

    logger.info(`SQLite database initialized at: ${dbPath}`);

    // Criar tabelas
    createTables();

    return db;
  } catch (err) {
    logger.error("Erro ao inicializar SQLite", err);
    throw err;
  }
}

/**
 * Verifica se uma coluna existe em uma tabela
 */
function columnExists(tableName: string, columnName: string): boolean {
  if (!db) return false;

  try {
    const result = db.pragma(`table_info(${tableName})`) as Array<Record<string, unknown>>;
    return result.some((col) => String((col as Record<string, unknown>).name) === columnName);
  } catch {
    return false;
  }
}

/**
 * Executa migrations necessárias
 */
function runMigrations() {
  if (!db) {
    throw new Error("Database not initialized");
  }

  // Migration 1: REMOVER colunas de script (se existirem) por segurança
  const hasScriptColumns = columnExists("optimization_history", "original_script");

  if (hasScriptColumns) {
    try {
      logger.info("Migrando tabela optimization_history para REMOVER colunas de scripts...");

      // Verificar se tabela antiga existe
      const tableCheck = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='optimization_history'"
      ).get();

      if (tableCheck) {
        // Criar tabela temporária SEM colunas de script
        db.exec(`
          CREATE TABLE optimization_history_new (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            mode TEXT NOT NULL,
            original_lines INTEGER NOT NULL DEFAULT 0,
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

        // Tentar copiar dados antigos
        try {
          // Migra apenas metadados, scripts são descartados por segurança
          db.exec(`
            INSERT INTO optimization_history_new (
              id, user_id, mode, original_lines, optimized_lines,
              breaking_risk, changes_count, duration_ms, llm_provider,
              success, created_at, completed_at
            )
            SELECT 
              id, user_id, mode, 
              COALESCE(original_lines, 0), optimized_lines,
              breaking_risk, changes_count, duration_ms, llm_provider,
              COALESCE(success, 0), created_at, completed_at
            FROM optimization_history;
          `);
        } catch (_copyErr) {
          logger.warn("Could not copy old data (incompatible structure), creating fresh table");
        }

        // Remover tabela antiga
        db.exec("DROP TABLE optimization_history");

        // Renomear nova tabela
        db.exec("ALTER TABLE optimization_history_new RENAME TO optimization_history");

        // Recriar índices
        db.exec(`
          CREATE INDEX idx_opt_created ON optimization_history(created_at DESC);
          CREATE INDEX idx_opt_user ON optimization_history(user_id, created_at DESC);
          CREATE INDEX idx_opt_success ON optimization_history(success, created_at DESC);
        `);
      }
    } catch (err) {
      logger.error("Migration de optimization_history falhou", err);
      // Se falhar, dropar tabela e deixar CREATE TABLE IF NOT EXISTS recriar
      try {
        db.exec("DROP TABLE IF EXISTS optimization_history");
      } catch {
        // Ignore
      }
    }
  }

  // Migration 2: REMOVER coluna script de active_sessions (se existir)
  const sessionsHasScript = columnExists("active_sessions", "script");

  if (sessionsHasScript) {
    try {
      logger.info("Migrando tabela active_sessions para REMOVER coluna script...");

      const sessionTableCheck = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='active_sessions'"
      ).get();

      if (sessionTableCheck) {
        // Criar tabela temporária SEM coluna script
        db.exec(`
          CREATE TABLE active_sessions_new (
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

        // Copiar dados (sem o campo script)
        try {
          db.exec(`
            INSERT INTO active_sessions_new (
              id, user_id, mode, llm_provider, llm_model,
              progress_data, status, created_at, updated_at, expires_at
            )
            SELECT 
              id, user_id, mode, llm_provider, llm_model,
              progress_data, status, created_at, updated_at, expires_at
            FROM active_sessions;
          `);
        } catch (_copyErr) {
          logger.warn("Could not copy active_sessions data, creating fresh table");
        }

        // Remover tabela antiga
        db.exec("DROP TABLE active_sessions");

        // Renomear nova tabela
        db.exec("ALTER TABLE active_sessions_new RENAME TO active_sessions");

        // Recriar índices
        db.exec(`
          CREATE INDEX idx_session_user ON active_sessions(user_id, updated_at DESC);
          CREATE INDEX idx_session_expires ON active_sessions(expires_at);
          CREATE INDEX idx_session_status ON active_sessions(status, updated_at DESC);
        `);

        logger.info("Migration de active_sessions concluída com sucesso");
      }
    } catch (err) {
      logger.error("Migration de active_sessions falhou", err);
      // Se falhar, dropar tabela e deixar CREATE TABLE IF NOT EXISTS recriar
      try {
        db.exec("DROP TABLE IF EXISTS active_sessions");
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Cria as tabelas do banco de dados
 */
function createTables() {
  if (!db) {
    throw new Error("Database not initialized");
  }

  // Tabela de mensagens de contato
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL,
      message TEXT,
      created_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_contact_created 
    ON contact_messages(created_at DESC);
  `);

  // Tabela de histórico de otimizações
  // IMPORTANTE: Scripts NÃO são salvos por segurança/privacidade
  db.exec(`
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
    
    CREATE INDEX IF NOT EXISTS idx_opt_created 
    ON optimization_history(created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_opt_user 
    ON optimization_history(user_id, created_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_opt_success
    ON optimization_history(success, created_at DESC);
  `);

  // Executar migrations para atualizar tabelas existentes
  runMigrations();

  // Tabela de métricas de performance
  db.exec(`
    CREATE TABLE IF NOT EXISTS performance_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      optimization_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (optimization_id) REFERENCES optimization_history(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_metrics_opt 
    ON performance_metrics(optimization_id);
  `);

  // Tabela de logs de auditoria
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_entity 
    ON audit_logs(entity_type, entity_id);
    
    CREATE INDEX IF NOT EXISTS idx_audit_created 
    ON audit_logs(created_at DESC);
  `);

  // Tabela de cache de LLM responses
  db.exec(`
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
    
    CREATE INDEX IF NOT EXISTS idx_cache_hash 
    ON llm_cache(prompt_hash);
    
    CREATE INDEX IF NOT EXISTS idx_cache_accessed 
    ON llm_cache(accessed_at DESC);
  `);

  // Tabela de sessões ativas de otimização
  // IMPORTANTE: Scripts NÃO são salvos, apenas metadados da sessão
  db.exec(`
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
    
    CREATE INDEX IF NOT EXISTS idx_session_user 
    ON active_sessions(user_id, updated_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_session_expires 
    ON active_sessions(expires_at);
    
    CREATE INDEX IF NOT EXISTS idx_session_status
    ON active_sessions(status, updated_at DESC);
  `);

  // Tabela de usuários autenticados
  db.exec(`
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
    
    CREATE INDEX IF NOT EXISTS idx_user_email 
    ON users(email);
    
    CREATE INDEX IF NOT EXISTS idx_user_google 
    ON users(google_id);
    
    CREATE INDEX IF NOT EXISTS idx_user_role
    ON users(role, is_active);
  `);

  // Tabela de sessões de autenticação
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_activity TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_auth_token 
    ON auth_sessions(token);
    
    CREATE INDEX IF NOT EXISTS idx_auth_user 
    ON auth_sessions(user_id, last_activity DESC);
    
    CREATE INDEX IF NOT EXISTS idx_auth_expires 
    ON auth_sessions(expires_at);
  `);

  // Tabela de controle de uso diário (FREE TIER quota tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_daily_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      executed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_usage_user_date 
    ON user_daily_usage(user_id, executed_at DESC);
    
    CREATE INDEX IF NOT EXISTS idx_usage_mode 
    ON user_daily_usage(mode, executed_at DESC);
  `);

  // ========== ANALYTICS TABLES (Sistema de Monitoramento Enterprise) ==========

  // Tabela de visualizações de página
  db.exec(`
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
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_analytics_pv_page 
    ON analytics_page_views(page, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_pv_user 
    ON analytics_page_views(user_id, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_pv_session 
    ON analytics_page_views(session_id, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_pv_owner 
    ON analytics_page_views(is_owner, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_pv_timestamp 
    ON analytics_page_views(timestamp DESC);
  `);

  // Tabela de eventos customizados
  db.exec(`
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
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_analytics_ev_type 
    ON analytics_events(event_type, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_ev_category 
    ON analytics_events(event_category, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_ev_user 
    ON analytics_events(user_id, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_ev_session 
    ON analytics_events(session_id, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_ev_owner 
    ON analytics_events(is_owner, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_ev_timestamp 
    ON analytics_events(timestamp DESC);
  `);

  // Tabela de sessões de navegação
  db.exec(`
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
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_analytics_sess_id 
    ON analytics_sessions(session_id);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_sess_user 
    ON analytics_sessions(user_id, start_time DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_sess_owner 
    ON analytics_sessions(is_owner, start_time DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_sess_start 
    ON analytics_sessions(start_time DESC);
    
    CREATE INDEX IF NOT EXISTS idx_analytics_sess_activity 
    ON analytics_sessions(last_activity DESC);
  `);

  // Reduz ruído no console: não logar criação/validação de tabelas a cada boot
}

/**
 * Obtém instância do banco de dados
 */
export function getSqliteDb(): Database.Database {
  if (!db) {
    return initSqliteDb();
  }
  return db;
}

/**
 * Fecha a conexão do banco de dados
 */
export function closeSqliteDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info("SQLite database closed");
  }
}

/**
 * Execute uma transação
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getSqliteDb();
  const trx = database.transaction(fn);
  return trx(database);
}

/**
 * Retorna a instância do banco de dados (pode retornar null)
 */
export function getDb(): Database.Database | null {
  return db;
}

// Export como objeto também para compatibilidade
export const sqliteDb = {
  initSqliteDb,
  getDb,
  getSqliteDb,
  closeSqliteDb,
  transaction
};
