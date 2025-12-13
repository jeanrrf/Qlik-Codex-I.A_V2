# 🧠 Sistema RAG - Retrieval-Augmented Generation

## Visão Geral

O Qlik Codex I.A implementa um sistema RAG (Retrieval-Augmented Generation) com **aprendizado por reforço baseado em feedback do usuário**. O sistema aprende com otimizações aprovadas e as usa como contexto para melhorar futuras sugestões.

## 🎯 Objetivos

1. **Aprendizado Contínuo**: Armazena otimizações bem-sucedidas como exemplos
2. **Busca Vetorial**: Encontra otimizações similares usando embeddings (768D)
3. **Feedback do Usuário**: Aprova (✅) ou rejeita (❌) otimizações
4. **Recompensa Progressiva**: Score aumenta com aprovações, diminui com rejeições
5. **Contexto Inteligente**: Injeta exemplos relevantes nos prompts da LLM

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO RAG COMPLETO                       │
└─────────────────────────────────────────────────────────────┘

1. USUÁRIO ENVIA SCRIPT
   ↓
2. optimizerService.runUltraExpertMode()
   ├─ vectorRAGService.buildRAGContext(script)
   │  ├─ Gera embedding do script (768D via Google)
   │  ├─ Busca vetorial: cosine similarity
   │  └─ Retorna top N otimizações similares
   ↓
3. QlikOptimizeAgent recebe ragContext
   ├─ buildMegaPrompt() injeta exemplos
   └─ "CONTEXTO VIA RAG" no prompt
   ↓
4. LLM processa com contexto enriquecido
   ↓
5. Otimização retornada com optimizationId
   ├─ vectorRAGService.indexOptimization()
   └─ Embedding gerado e armazenado (status='pending_feedback')
   ↓
6. FRONTEND EXIBE BOTÕES APPROVE/REJECT
   ↓
7. USUÁRIO DÁ FEEDBACK
   ├─ Aprovar → +10 reward_score, status='approved'
   └─ Rejeitar → reward_score=0, status='rejected'
   ↓
8. PRÓXIMA OTIMIZAÇÃO USA APENAS APROVADAS
```

## 📦 Componentes

### Backend

#### 1. **Types** (`server/src/types/rag.ts`)
```typescript
interface RAGContext {
  examples: RAGSearchResult[];
  similarityScores: number[];
  commonPatterns: string[];
}

interface RAGSearchResult {
  optimizationId: string;
  similarity: number;
  rewardScore: number;
  hybridScore: number;
  originalSnippet: string;
  optimizedSnippet: string;
  changesSummary: string;
  patterns: string[];
}
```

#### 2. **Service** (`server/src/services/vectorRAGService.ts`)

**Métodos Principais:**
- `initialize()` - Cria tabelas Turso DB
- `indexOptimization()` - Gera embedding e armazena
- `searchSimilar()` - Busca vetorial com cosine similarity
- `buildRAGContext()` - Monta contexto para prompt
- `processFeedback()` - Processa approve/reject
- `getStats()` - Retorna métricas agregadas
- `cleanupRejected()` - Remove otimizações antigas rejeitadas

**Algoritmo de Busca:**
```typescript
hybridScore = cosineSimilarity * (1 + log(rewardScore + 1))
```

#### 3. **Integration** (`server/src/services/optimizerService.ts`)
- Busca RAG context **antes** da otimização
- Indexa resultado **após** sucesso
- Fail-open: continua sem RAG se falhar

#### 4. **Routes** (`server/src/routes/rag.routes.ts`)
```
POST /api/rag/feedback    - Processar feedback do usuário
GET  /api/rag/stats       - Estatísticas do sistema
POST /api/rag/cleanup     - Limpeza de rejeitadas (admin)
```

### Frontend

#### 1. **Component** (`web/src/components/OptimizationFeedback.tsx`)
- Botões Aprovar/Rejeitar com animações
- Campo de comentário opcional (500 chars)
- Feedback visual imediato
- Estados: pending → approved/rejected

#### 2. **Integration** (`web/src/pages/OptimizerPageV2.tsx`)
```tsx
{result.optimizationId && (
  <OptimizationFeedback optimizationId={result.optimizationId} />
)}
```

## 🗄️ Banco de Dados (Turso SQLite)

### Tabela: `optimization_vectors`
```sql
CREATE TABLE optimization_vectors (
  id TEXT PRIMARY KEY,
  optimization_id TEXT UNIQUE NOT NULL,
  script_hash TEXT NOT NULL,           -- SHA-256 do script original
  created_at TEXT NOT NULL,
  mode TEXT NOT NULL,                  -- 'ultra-expert' | 'nvidia-fast'
  provider TEXT NOT NULL,              -- 'google' | 'nvidia'
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_feedback',
  reward_score INTEGER NOT NULL DEFAULT 0,
  script_lines INTEGER NOT NULL,
  complexity TEXT NOT NULL,
  breaking_risk TEXT NOT NULL,
  optimization_tags TEXT,              -- JSON array
  user_id TEXT,
  embedding BLOB NOT NULL,             -- Float32Array (768 dims)
  original_snippet TEXT NOT NULL,      -- Primeiras 500 chars
  optimized_snippet TEXT NOT NULL,     -- Primeiras 500 chars
  changes_summary TEXT NOT NULL,
  patterns TEXT,                       -- JSON array
  updated_at TEXT NOT NULL
);

-- Índices
CREATE INDEX idx_opt_vec_status ON optimization_vectors(status);
CREATE INDEX idx_opt_vec_reward ON optimization_vectors(reward_score DESC);
CREATE INDEX idx_opt_vec_hash ON optimization_vectors(script_hash);
```

### Tabela: `optimization_feedback`
```sql
CREATE TABLE optimization_feedback (
  id TEXT PRIMARY KEY,
  optimization_id TEXT NOT NULL,
  user_id TEXT,
  feedback_type TEXT NOT NULL,         -- 'approve' | 'reject'
  comment TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(optimization_id) REFERENCES optimization_vectors(optimization_id)
);
```

### Tabela: `rag_stats_cache`
```sql
CREATE TABLE rag_stats_cache (
  id INTEGER PRIMARY KEY DEFAULT 1,
  total_documents INTEGER DEFAULT 0,
  approved_documents INTEGER DEFAULT 0,
  rejected_documents INTEGER DEFAULT 0,
  pending_documents INTEGER DEFAULT 0,
  avg_reward_score REAL DEFAULT 0,
  last_updated TEXT NOT NULL
);
```

## ⚙️ Configuração

### Variáveis de Ambiente (`.env`)

```env
# Habilitar RAG
RAG_ENABLED=true

# Número máximo de exemplos no contexto
RAG_MAX_EXAMPLES=3

# Threshold de similaridade (0-1)
RAG_SIMILARITY_THRESHOLD=0.7

# Score mínimo para considerar exemplo
RAG_MIN_REWARD_SCORE=5

# Timeout da busca vetorial (ms)
RAG_SEARCH_TIMEOUT_MS=200

# Modelo de embedding Google
RAG_EMBEDDING_MODEL=text-embedding-004

# Dimensões do vetor
RAG_EMBEDDING_DIMENSIONS=768
```

### Configuração Recomendada

**Desenvolvimento:**
```env
RAG_ENABLED=true
RAG_MAX_EXAMPLES=2
RAG_SIMILARITY_THRESHOLD=0.6
RAG_MIN_REWARD_SCORE=3
```

**Produção:**
```env
RAG_ENABLED=true
RAG_MAX_EXAMPLES=3
RAG_SIMILARITY_THRESHOLD=0.7
RAG_MIN_REWARD_SCORE=5
```

## 📊 Métricas e Monitoramento

### Endpoint: `GET /api/metrics/stats`

```json
{
  "timestamp": "2025-12-12T10:30:00.000Z",
  "rag": {
    "enabled": true,
    "totalDocuments": 150,
    "approvedDocuments": 85,
    "rejectedDocuments": 20,
    "pendingDocuments": 45,
    "avgRewardScore": 12.4
  }
}
```

### Logs do Sistema

```
[RAG] Initializing vector tables in Turso DB
[RAG] Searching for similar optimizations
[RAG] Found 3 similar optimizations (similarities: [0.87, 0.82, 0.75])
[RAG] Optimization indexed: opt_abc123xyz
[RAG] Optimization approved: opt_abc123xyz, newScore: +10
```

## 🔄 Fluxo de Feedback

### Aprovação (✅)
```
1. Usuário clica "Aprovar"
2. POST /api/rag/feedback { optimizationId, feedbackType: 'approve' }
3. reward_score += 10
4. status = 'approved'
5. Feedback registrado em optimization_feedback
6. UI exibe confirmação verde
```

### Rejeição (❌)
```
1. Usuário clica "Rejeitar"
2. POST /api/rag/feedback { optimizationId, feedbackType: 'reject' }
3. reward_score = 0
4. status = 'rejected'
5. Otimização não será mais usada como referência
6. UI exibe confirmação laranja
```

## 🧪 Testando o Sistema

### 1. Habilitar RAG
```bash
# No .env
RAG_ENABLED=true
```

### 2. Iniciar Servidor
```bash
npm run start:dev
```

### 3. Primeira Otimização
- Envie um script Qlik
- Sistema indexa mas não tem contexto RAG (primeira vez)
- Aprove a otimização (✅)

### 4. Segunda Otimização (Similar)
- Envie script similar ao primeiro
- Sistema busca e encontra o exemplo aprovado
- Contexto RAG é injetado no prompt
- Melhor qualidade esperada

### 5. Verificar Logs
```
[RAG] Found 1 similar optimization (similarity: 0.85)
```

### 6. Verificar Stats
```bash
curl http://localhost:3000/api/metrics/stats
```

## 🛡️ Segurança e Privacidade

1. **Isolamento por Usuário**: `user_id` permite filtrar por usuário (futuro)
2. **Hash de Script**: Detecta duplicatas sem armazenar script completo
3. **Snippets Limitados**: Apenas 500 chars do original/otimizado
4. **Feedback Anônimo**: Comentários opcionais podem ser anônimos
5. **Cleanup Automático**: Otimizações rejeitadas são limpáveis

## 🚀 Performance

### Otimizações Implementadas

1. **Índices de Banco**: `status`, `reward_score`, `script_hash`
2. **Timeout de Busca**: Máximo 200ms (configurável)
3. **Limite de Candidatos**: Busca top 100, retorna top N
4. **Fail-Open**: Sistema continua sem RAG se busca falhar
5. **Cache de Stats**: Tabela `rag_stats_cache` evita queries pesadas

### Benchmarks Esperados

- **Geração de Embedding**: ~200-500ms (Google API)
- **Busca Vetorial**: ~50-150ms (100 documentos)
- **Indexação**: ~300-800ms total
- **Overhead Total**: ~500-1500ms por otimização

## 🔧 Troubleshooting

### RAG não está funcionando
```bash
# Verificar se está habilitado
grep RAG_ENABLED .env

# Verificar logs
npm run server:dev | grep RAG

# Verificar tabelas
# No Turso CLI:
turso db shell qlik-codex-production
SELECT COUNT(*) FROM optimization_vectors;
```

### Sem resultados similares
- Threshold muito alto → reduzir `RAG_SIMILARITY_THRESHOLD`
- Poucas otimizações aprovadas → aprovar mais resultados
- Scripts muito diferentes → normalizar complexidade

### Performance lenta
- Aumentar `RAG_SEARCH_TIMEOUT_MS`
- Reduzir `RAG_MAX_EXAMPLES`
- Verificar índices do banco
- Limpar otimizações rejeitadas antigas

## 📚 Próximos Passos

### Melhorias Planejadas

1. **Multi-tenancy**: Filtro por `user_id` e `tenant_id`
2. **A/B Testing**: Comparar com/sem RAG
3. **Fine-tuning**: Ajustar embeddings com feedback
4. **Cache de Embeddings**: Redis para scripts repetidos
5. **Análise de Padrões**: ML para detectar padrões comuns
6. **Dashboard RAG**: UI para visualizar métricas

### Features Futuras

- [ ] Export/Import de otimizações aprovadas
- [ ] RAG cross-tenant (compartilhar conhecimento)
- [ ] Versionamento de otimizações
- [ ] Rollback de feedback
- [ ] API para treinar modelos customizados

## 📝 Changelog

### v1.0.0 (2025-12-12)
- ✅ Sistema RAG completo implementado
- ✅ Busca vetorial com cosine similarity
- ✅ Feedback do usuário (approve/reject)
- ✅ Integração no pipeline de otimização
- ✅ UI de feedback com animações
- ✅ Métricas e monitoramento
- ✅ Documentação completa

---

**Autor**: Qlik Codex I.A Team  
**Última Atualização**: 12/12/2025  
**Versão**: 1.0.0
