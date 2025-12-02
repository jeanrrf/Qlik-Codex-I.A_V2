/**
 * Migration Script - Remove Scripts do Banco de Dados
 * 
 * Este script remove as colunas que armazenavam scripts completos
 * das tabelas optimization_history e active_sessions.
 * 
 * MOTIVO: Segurança e privacidade - scripts Qlik podem conter
 * informações sensíveis e não devem ser persistidos.
 * 
 * EXECUÇÃO:
 * node server/scripts/migrate-remove-scripts.js
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "..", "data", "qlik-codex.db");

function columnExists(db, tableName, columnName) {
  try {
    const info = db.pragma(`table_info(${tableName})`);
    return info.some(col => col.name === columnName);
  } catch {
    return false;
  }
}

function migrateDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("❌ Banco de dados não encontrado:", DB_PATH);
    console.log("✓ Nada a migrar - banco será criado sem colunas de scripts");
    return;
  }

  console.log("🔧 Iniciando migration para remover scripts...\n");
  const db = new Database(DB_PATH);

  try {
    // === MIGRATION 1: optimization_history ===
    const hasOptScript = columnExists(db, "optimization_history", "original_script");

    if (hasOptScript) {
      console.log("📋 Migrando optimization_history...");

      db.exec(`
        -- Criar nova tabela sem colunas de script
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

        -- Copiar dados (SEM scripts)
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

        -- Substituir tabela
        DROP TABLE optimization_history;
        ALTER TABLE optimization_history_new RENAME TO optimization_history;

        -- Recriar índices
        CREATE INDEX idx_opt_created ON optimization_history(created_at DESC);
        CREATE INDEX idx_opt_user ON optimization_history(user_id, created_at DESC);
        CREATE INDEX idx_opt_success ON optimization_history(success, created_at DESC);
      `);

      const count = db.prepare("SELECT COUNT(*) as total FROM optimization_history").get().total;
      console.log(`✅ optimization_history migrada: ${count} registros preservados (scripts removidos)\n`);
    } else {
      console.log("✓ optimization_history já está atualizada\n");
    }

    // === MIGRATION 2: active_sessions ===
    const hasSessionScript = columnExists(db, "active_sessions", "script");

    if (hasSessionScript) {
      console.log("📋 Migrando active_sessions...");

      db.exec(`
        -- Criar nova tabela sem coluna script
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

        -- Copiar dados (SEM script)
        INSERT INTO active_sessions_new (
          id, user_id, mode, llm_provider, llm_model,
          progress_data, status, created_at, updated_at, expires_at
        )
        SELECT 
          id, user_id, mode, llm_provider, llm_model,
          progress_data, status, created_at, updated_at, expires_at
        FROM active_sessions;

        -- Substituir tabela
        DROP TABLE active_sessions;
        ALTER TABLE active_sessions_new RENAME TO active_sessions;

        -- Recriar índices
        CREATE INDEX idx_session_user ON active_sessions(user_id, updated_at DESC);
        CREATE INDEX idx_session_expires ON active_sessions(expires_at);
        CREATE INDEX idx_session_status ON active_sessions(status, updated_at DESC);
      `);

      const count = db.prepare("SELECT COUNT(*) as total FROM active_sessions").get().total;
      console.log(`✅ active_sessions migrada: ${count} sessões preservadas (scripts removidos)\n`);
    } else {
      console.log("✓ active_sessions já está atualizada\n");
    }

    console.log("🎉 Migration concluída com sucesso!");
    console.log("🔒 Scripts não são mais armazenados no banco de dados");

  } catch (error) {
    console.error("❌ Erro durante migration:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Executar migration
migrateDatabase();
