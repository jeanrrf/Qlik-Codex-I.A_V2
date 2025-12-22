# Refactor V2 — Changelog (2024-12-22)

## Resumo

Refatoração completa do pipeline de otimização Qlik para resolver:

- Colapso de contexto em prompts longos
- Regras over-constrained (LOAD \* era erro duro)
- Parser JSON frágil
- Histórico de contexto truncado (300 chars)

---

## Etapas Concluídas

### 1. Compactador Seguro (`server/src/lib/promptCompactor.ts`)

**Antes:** Colapsava todos os espaços (`\s{2,}` → ` `), destruindo indentação.

**Depois:**

- Nova interface `CompactionOptions` com flags:
  - `preserveBlockStructure` (default: true) — mantém 1 blank line entre blocos
  - `preserveIndentation` (default: true) — preserva 4 espaços de indentação
  - `maxConsecutiveBlanks` (default: 1)
  - `minReductionPct` (default: 5)
- Indentação semântica preservada (4 espaços)
- Múltiplos blanks limitados a 1

### 2. Prompts e Templates (`server/src/prompts/`)

**Mudanças em `core.ts`:**

- Guardrails encurtados (13 regras concisas)
- **LOAD \* agora é CAUTION**, não FORBIDDEN
- Nova seção `PLANNING_INSTRUCTIONS` para "pensar antes de agir"
- Versão atualizada para `2.2.0`

**Mudanças em `builders.ts`:**

- Import de `PLANNING_INSTRUCTIONS`
- Seção de planejamento adicionada para tasks CODE_GEN, NVIDIA_FAST, GRANULAR_STEP

**Mudanças em `index.ts`:**

- Export de `PLANNING_INSTRUCTIONS`

### 3. Agente Principal (`server/src/agents/qlikOptimizeAgent.ts`)

- Import de `CompactionOptions`
- `MAX_HISTORY_TOKENS` aumentado de 300 → **800** chars
- Chamada de `compactScriptForPrompt` agora passa opções de preservação

### 4. Parser JSON Tolerante (`server/src/lib/structuredResponse.ts`)

**Melhorias em `extractJsonFromText`:**

- Parse direto primeiro (fast path)
- Remoção agressiva de markdown fences
- Tracking de strings em brace matching (evita falsos positivos)
- Suporte a trailing commas (`,}` → `}`)
- Fallback para unquoted keys

### 5. Validator de Qlik (`server/src/validators/qlikValidator.ts`)

- Comentário `⚠️ LEGACY` em `HALLUCINATED_FUNCTIONS` para rastreamento
- Sem mudanças funcionais (mantendo retrocompatibilidade)

### 6. Feature Flags (`server/src/lib/config.ts`)

Novos flags em `config.featureFlags`:

```typescript
featureFlags: {
  useNewCompactor: true,
  usePlanningInstructions: true,
  loadStarWarningOnly: true,
  tolerantJsonParser: true,
  dynamicHistoryLimit: true,
  legacyMode: false  // rollback rápido
}
```

### 7. Testes Atualizados

**`server/test/lib/promptCompactor.spec.ts`:**

- 5 testes para nova lógica V2
- Cobertura de preserveBlockStructure, preserveIndentation, minReductionPct

**`server/test/lib/structuredResponse.spec.ts`:**

- 7 testes incluindo trailing commas, unquoted keys, markdown embedded

### 8. Frontend Modos — Audit vs Refactor (CONCLUÍDO)

**Tipo Novo (`web/src/types/api.ts`):**

- `OptimizationIntent = "audit" | "refactor"`
- Adicionado campo `intent` em `OptimizeScriptRequestBody`

**API Client (`web/src/api/client.ts`):**

- `OptimizeOptions` agora aceita `intent`
- Payload enviado com `intent` (default: "refactor")

**Hook (`web/src/hooks/useOptimizationProgress.ts`):**

- `OptimizationOptions` inclui `intent`
- Passa `intent` no body da requisição

**UI (`web/src/pages/OptimizerPageV2.tsx`):**

- Estado `intent` com toggle
- Toggle visual com ícones 🔍 (Audit) e ⚡ (Refactor)
- Visível apenas no modo ultra-expert

**CSS (`web/src/pages/OptimizerPageV2.css`):**

- Estilos para `.intent-toggle-container` e `.intent-toggle-btn`

**Backend — Schema (`server/src/validators/requestSchemas.ts`):**

- Campo `intent` no `optimizeScriptSchema` (enum: "audit" | "refactor")

**Backend — Tipos (`server/src/types/api.ts`, `server/src/types/optimization.ts`):**

- `OptimizationIntent` type exportado
- `LLMOptions.intent` adicionado

**Backend — Serviços:**

- `scriptService.ts`: Passa intent para `optimizerService`
- `optimizerService.ts`: Passa intent para `QlikOptimizeAgent`

**Backend — Agente (`server/src/agents/qlikOptimizeAgent.ts`):**

- Recebe `intent` via `MegaOptimizerOptions`
- Quando `intent === "audit"`:
  - Pula `CODE_GEN` (emit status "skipped")
  - Retorna script original sem modificações
  - Executa apenas `FINAL_DELIVERY` para documentação
- Quando `intent === "refactor"`: fluxo completo

---

## Etapa Pendente

_Nenhuma — Refactor V2 concluído!_

---

## Resultados dos Testes

```
✓ test/lib/promptCompactor.spec.ts (5)
✓ test/lib/structuredResponse.spec.ts (7)
✓ test/validators/qlikValidator.spec.ts (3)
✓ test/validators/incompleteCodeDetection.spec.ts (7)
✓ test/qlikValidator.test.ts (10)
```

Falhas pré-existentes (não relacionadas ao refactor):

- `sessionService.spec.ts` — requer Turso env
- `qlikFormatterService.spec.ts` — arquivo não existe

---

## Como Fazer Rollback

1. Setar `config.featureFlags.legacyMode = true` em `config.ts`
2. Ou reverter commits específicos dos arquivos alterados

---

## Próximos Passos

1. ~~Implementar modo Audit vs Refactor no frontend~~ ✅ Concluído
2. Adicionar métricas de observabilidade (tamanho de prompt, taxa de fallback)
3. Testar em produção com scripts reais
4. Remover código legacy após validação (marcar com `// @deprecated`)
