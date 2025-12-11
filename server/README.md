# Qlik Codex I.A – Server

Backend em Node.js + TypeScript responsável por expor as rotas REST, orquestrar os agentes AINEX e servir o bundle do frontend produzido pelo Vite.

## Scripts

```bash
npm install          # instala dependências
npm run dev          # modo desenvolvimento com ts-node-dev
npm run build        # compila para dist
npm start            # executa código compilado
npm run lint         # ESLint flat config
npm run typecheck    # verificação de tipos
```

## Estrutura de Pastas

```
src/
  index.ts                # bootstrap Express + static build
  routes/                 # rotas REST
  services/               # regras de negócio + agentes
  agents/                 # agentes AINEX (placeholder para integração LLM)
  validators/             # validações Zod e heurísticas de Qlik
  middleware/             # middlewares compartilhados
  lib/                    # config/env/logger/db/llm client
  types/                  # tipos globais compartilhados
```

## Fluxo Básico

1. Cliente envia script Qlik para `POST /api/scripts/optimize`.
2. `scriptService` valida payload e delega para `optimizerService`.
3. `optimizerService` aciona o agente `qlikOptimizeAgent` para produzir otimizações
   e consulta os agentes de revisão/explicação.
4. Heurísticas em `qlikValidator` analisam riscos e sinalizam `safeToApply`.
5. Resposta estruturada é devolvida ao cliente e pode ser persistida (via `lib/db`).

A integração com o LLM será implementada dentro dos arquivos em `src/agents` e `src/lib/llmClient` nas próximas etapas.

## 📚 Documentação Relacionada

- [Banco de Dados](../docs/guides/DATABASE.md) - Estrutura SQLite/Turso
- [Extreme Mode](../docs/EXTREME_MODE_IMPLEMENTATION.md) - Features avançadas
- [Setup de Produção](../docs/PRODUCTION_SETUP.md) - Deploy em produção

## Recursos Inativos (Para Futuro)

### Cache Service (`services/cacheService.ts`)
Um serviço completo de cache com TTL (1 hora) está implementado mas **não está integrado ao fluxo de otimização**.

**Propósito**: Evitar reprocessamento de scripts idênticos pela LLM
**Benefício esperado**: 50-70% mais rápido em otimizações repetidas
**Status**: Pronto para integração na Phase 3

**Integração futura**:
```typescript
// Em optimizerService.ts
const cached = cacheService.get(script, mode, provider);
if (cached) return cached;  // Pula LLM
const result = await runOptimize(script);
cacheService.set(script, mode, result, provider);
```

### Context Service (`services/contextService.ts`)
Um gerenciador de contexto request-scoped para futuro suporte a autenticação e multi-tenancy.

**Propósito**: Armazenar metadados do usuário/sessão por request
**Status**: Reservado para Phase 3 (implementação de auth)

## Otimizações e Limpeza Recente

**Removido (30 Nov 2025)**:
- ✓ `services/authService.ts` - Stub não implementado
- ✓ `routes/auth.routes.ts` - Nunca foi montada
- ✓ `middleware/authMiddleware.ts` - Não aplicada em rotas
- ✓ `/nvidiaService.js` (raiz) - Duplicado/legado
- ✓ Outros arquivos backup

Para detalhes completos, veja: [Cleanup Plan](../CLEANUP_PLAN.md)
