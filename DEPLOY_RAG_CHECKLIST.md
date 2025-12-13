# ✅ RAG System - Checklist de Deployment

## Pré-Deployment

### 1. Configuração de Ambiente
- [ ] Copiar `.env.example` para `.env`
- [ ] Configurar `RAG_ENABLED=true`
- [ ] Ajustar thresholds conforme necessidade
- [ ] Verificar `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`
- [ ] Confirmar `GEMINI_API_KEY` configurada

### 2. Build e Testes
- [ ] `cd server && npm run typecheck` ✅ (Passou)
- [ ] `cd server && npm run build` ✅ (Passou)
- [ ] `cd web && npm run lint` ✅ (Passou - 0 erros)
- [ ] `cd web && npm run build` ✅ (Passou)

### 3. Banco de Dados
- [ ] Criar database Turso (se não existir)
  ```bash
  turso db create qlik-codex-production
  ```
- [ ] Inicialização automática das tabelas ao iniciar servidor
- [ ] Verificar tabelas criadas:
  - `optimization_vectors`
  - `optimization_feedback`
  - `rag_stats_cache`

### 4. Testes Manuais
- [ ] Iniciar servidor: `npm run start:dev`
- [ ] Fazer primeira otimização
- [ ] Verificar se `optimizationId` aparece no response
- [ ] Verificar se botões Aprovar/Rejeitar aparecem no frontend
- [ ] Testar aprovação (✅)
- [ ] Verificar logs: `[RAG] Optimization approved`
- [ ] Fazer segunda otimização similar
- [ ] Verificar logs: `[RAG] Found N similar optimizations`
- [ ] Verificar métricas: `GET /api/metrics/stats`

## Deployment

### Produção (Vercel/Render)

#### 1. Variáveis de Ambiente
```env
# Turso (Obrigatório)
TURSO_DATABASE_URL=libsql://[your-db].turso.io
TURSO_AUTH_TOKEN=eyJhbGc...

# RAG Configuration
RAG_ENABLED=true
RAG_MAX_EXAMPLES=3
RAG_SIMILARITY_THRESHOLD=0.7
RAG_MIN_REWARD_SCORE=5
RAG_SEARCH_TIMEOUT_MS=200
RAG_EMBEDDING_MODEL=text-embedding-004
RAG_EMBEDDING_DIMENSIONS=768

# Gemini (Obrigatório para embeddings)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL_NAME=gemini-2.5-flash

# Outras variáveis existentes...
```

#### 2. Deploy Steps
- [ ] Push para branch `main` ou `OFICIAL`
- [ ] Verificar build automático
- [ ] Verificar logs de inicialização RAG
- [ ] Testar endpoint: `https://[seu-dominio]/api/metrics/stats`

### Verificação Pós-Deploy

#### Health Check
```bash
# Verificar se servidor está rodando
curl https://[seu-dominio]/api/health

# Verificar RAG stats
curl https://[seu-dominio]/api/metrics/stats
```

**Resposta Esperada:**
```json
{
  "timestamp": "2025-12-12T...",
  "rag": {
    "enabled": true,
    "totalDocuments": 0,
    "approvedDocuments": 0,
    "rejectedDocuments": 0,
    "pendingDocuments": 0,
    "avgRewardScore": 0
  }
}
```

#### Teste de Fluxo Completo
1. [ ] Enviar script Qlik para otimização
2. [ ] Verificar response contém `optimizationId`
3. [ ] Verificar botões de feedback no frontend
4. [ ] Aprovar otimização
5. [ ] Enviar script similar
6. [ ] Verificar logs: "Found N similar optimizations"
7. [ ] Verificar stats: `approvedDocuments: 1`

## Monitoramento

### Logs Importantes
```
✅ [RAG] Vector tables initialized successfully
✅ [RAG] Searching for similar optimizations
✅ [RAG] Found 3 similar optimizations (similarities: [0.87, 0.82, 0.75])
✅ [RAG] Optimization indexed: opt_abc123xyz
✅ [RAG] Optimization approved: opt_abc123xyz, newScore: +10
```

### Logs de Erro (Esperados)
```
⚠️ [RAG] Failed to initialize RAG system (non-fatal, will continue without RAG)
⚠️ [RAG] Failed to search similar optimizations, continuing
⚠️ [RAG] Failed to index optimization, continuing
```
**Nota**: Sistema é fail-open, erros RAG não bloqueiam otimização

### Métricas de Sucesso
- [ ] Aprovação rate > 60%
- [ ] Similaridade média > 0.65
- [ ] Tempo de busca < 500ms
- [ ] Embeddings gerados sem erros

## Troubleshooting

### Problema: RAG não está inicializando
**Verificar:**
```bash
# Logs do servidor
grep "RAG" logs.txt

# Variável de ambiente
echo $RAG_ENABLED

# Turso connection
turso db shell qlik-codex-production
```

**Solução:**
- Verificar `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`
- Verificar `GEMINI_API_KEY`
- Verificar `RAG_ENABLED=true`

### Problema: Não encontra otimizações similares
**Verificar:**
```sql
SELECT COUNT(*) FROM optimization_vectors WHERE status = 'approved';
```

**Solução:**
- Aprovar mais otimizações
- Reduzir `RAG_SIMILARITY_THRESHOLD` (ex: 0.6)
- Reduzir `RAG_MIN_REWARD_SCORE` (ex: 3)

### Problema: Performance lenta
**Verificar:**
```sql
SELECT COUNT(*) FROM optimization_vectors;
EXPLAIN QUERY PLAN SELECT * FROM optimization_vectors WHERE status = 'approved';
```

**Solução:**
- Aumentar `RAG_SEARCH_TIMEOUT_MS`
- Verificar índices criados
- Limpar otimizações rejeitadas antigas:
  ```bash
  curl -X POST https://[seu-dominio]/api/rag/cleanup
  ```

## Rollback Plan

### Se RAG causar problemas:

#### Opção 1: Desabilitar RAG (Rápido)
```env
RAG_ENABLED=false
```
- Sistema continua funcionando normalmente
- Dados RAG preservados

#### Opção 2: Reverter Deploy
```bash
git revert [commit-hash]
git push origin main
```

#### Opção 3: Limpar Dados RAG
```sql
DELETE FROM optimization_vectors;
DELETE FROM optimization_feedback;
DELETE FROM rag_stats_cache;
```

## Performance Baseline

### Métricas Esperadas (após 1 semana)

| Métrica | Target | Atual |
|---------|--------|-------|
| Total Otimizações | 100+ | 0 |
| Taxa de Aprovação | >60% | N/A |
| Similaridade Média | >0.70 | N/A |
| Tempo de Busca | <300ms | N/A |
| Tempo de Indexação | <800ms | N/A |
| Erros RAG | <5% | N/A |

## Checklist Final

- [x] Código compilado sem erros (TypeScript)
- [x] Lint passou sem erros (ESLint)
- [x] Builds funcionando (server + web)
- [x] Documentação criada (`docs/RAG_SYSTEM.md`)
- [x] Checklist de deployment criado
- [ ] Variáveis de ambiente configuradas
- [ ] Banco de dados Turso configurado
- [ ] Deploy realizado
- [ ] Testes manuais concluídos
- [ ] Monitoramento ativo
- [ ] Logs verificados

---

**Status Atual**: ✅ **PRONTO PARA DEPLOY**

**Próximo Passo**: Configurar variáveis de ambiente e fazer deploy
