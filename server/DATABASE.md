# 🗄️ Banco de Dados SQLite - Qlik Codex I.A

## Visão Geral

O **Qlik Codex I.A** utiliza **SQLite** como banco de dados local para armazenar:

- ✅ Histórico de otimizações
- ✅ Métricas de performance
- ✅ Mensagens de contato
- ✅ Logs de auditoria
- ✅ Cache de respostas LLM

## 📍 Localização

O arquivo do banco de dados é criado automaticamente em:

```
server/data/qlik-codex.db
```

## 🏗️ Estrutura das Tabelas

### 1. `contact_messages`

Armazena mensagens de contato da landing page.

```sql
CREATE TABLE contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
```

### 2. `optimization_history`

Histórico completo de todas as otimizações realizadas.

```sql
CREATE TABLE optimization_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  mode TEXT NOT NULL,
  original_lines INTEGER NOT NULL,
  optimized_lines INTEGER NOT NULL,
  breaking_risk TEXT NOT NULL,
  changes_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  llm_provider TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
```

### 3. `performance_metrics`

Métricas de performance detalhadas por fase.

```sql
CREATE TABLE performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  optimization_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (optimization_id) REFERENCES optimization_history(id)
);
```

### 4. `audit_logs`

Logs de auditoria para rastreabilidade.

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
```

### 5. `llm_cache`

Cache inteligente de respostas LLM para reduzir custos e latência.

```sql
CREATE TABLE llm_cache (
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
```

## 🔌 API Endpoints

### História e Estatísticas

#### `GET /api/history/recent?limit=50`

Retorna histórico recente de otimizações.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "mode": "conservative",
      "original_lines": 450,
      "optimized_lines": 380,
      "breaking_risk": "low",
      "changes_count": 12,
      "duration_ms": 3200,
      "llm_provider": "gemini",
      "created_at": "2025-11-30T10:30:00Z"
    }
  ],
  "count": 50
}
```

#### `GET /api/history/stats`

Retorna estatísticas gerais.

**Response:**

```json
{
  "success": true,
  "data": {
    "total_optimizations": 1250,
    "total_lines_saved": 45000,
    "avg_duration_ms": 2800,
    "most_used_provider": "gemini"
  }
}
```

#### `DELETE /api/history/cleanup?days=90`

Remove registros mais antigos que N dias (admin).

**Response:**

```json
{
  "success": true,
  "message": "Removed 85 old records",
  "deleted": 85
}
```

## 📊 Uso Programático

### Salvar Otimização

```typescript
import { historyService } from "./services/historyService";

const optimizationId = historyService.saveOptimization(
  result, // OptimizeResult
  durationMs, // number
  "gemini" // provider
);
```

### Buscar Histórico

```typescript
const recent = historyService.getRecentOptimizations(50);
```

### Estatísticas

```typescript
const stats = historyService.getStatistics();
console.log(`Total: ${stats.total_optimizations}`);
console.log(`Linhas economizadas: ${stats.total_lines_saved}`);
```

## 🧹 Manutenção

### Limpeza Automática

O sistema mantém **90 dias** de histórico por padrão. Registros mais antigos são removidos automaticamente.

### Backup Manual

```bash
# Copiar banco de dados
cp server/data/qlik-codex.db server/data/backup-$(date +%Y%m%d).db
```

### Reset Completo

```bash
# Remover banco de dados (será recriado automaticamente)
rm server/data/qlik-codex.db
```

## 🔍 Consultas SQL Úteis

### Top 10 otimizações mais impactantes

```sql
SELECT
  mode,
  original_lines - optimized_lines as lines_saved,
  breaking_risk,
  duration_ms,
  created_at
FROM optimization_history
ORDER BY lines_saved DESC
LIMIT 10;
```

### Performance por provider

```sql
SELECT
  llm_provider,
  COUNT(*) as total,
  AVG(duration_ms) as avg_duration,
  SUM(original_lines - optimized_lines) as total_lines_saved
FROM optimization_history
GROUP BY llm_provider;
```

### Taxa de sucesso por modo

```sql
SELECT
  mode,
  COUNT(*) as total,
  SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(success) * 100, 2) as success_rate
FROM optimization_history
GROUP BY mode;
```

## 🚀 Vantagens do SQLite

- ✅ **Zero configuração**: Não precisa de servidor separado
- ✅ **Performance**: Extremamente rápido para operações locais
- ✅ **Portabilidade**: Um único arquivo de banco de dados
- ✅ **Confiabilidade**: ACID compliant
- ✅ **Leveza**: Apenas ~600KB de overhead
- ✅ **Backup simples**: Copiar/colar o arquivo .db

## 📈 Próximos Passos

- [ ] Dashboard de estatísticas no frontend
- [ ] Exportação de histórico para CSV/JSON
- [ ] Sistema de tags/categorias para otimizações
- [ ] Análise de tendências e insights
- [ ] Replicação opcional para PostgreSQL (produção)

---

**Documentação gerada em:** 30/11/2025  
**Versão do sistema:** 0.2.1
