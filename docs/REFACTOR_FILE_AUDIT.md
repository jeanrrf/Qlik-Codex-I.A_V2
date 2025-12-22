# 📊 Auditoria de Arquivos - Refatoração Qlik Codex AI

**Data:** 21/12/2025  
**Objetivo:** Mapear quais arquivos serão reutilizados, modificados ou excluídos

---

## 🟢 ARQUIVOS REUTILIZADOS (Sem Modificação)

### Backend - Core Infrastructure

| Arquivo               | Localização       | Justificativa                                  |
| --------------------- | ----------------- | ---------------------------------------------- |
| `config.ts`           | `server/src/lib/` | Configuração centralizada - não precisa mudar  |
| `logger.ts`           | `server/src/lib/` | Sistema de logs - funciona bem                 |
| `sseEmitter.ts`       | `server/src/lib/` | SSE para streaming - core do sistema           |
| `tursoDb.ts`          | `server/src/lib/` | Database adapter - não relacionado ao problema |
| `dbAdapter.ts`        | `server/src/lib/` | Database operations - não relacionado          |
| `analyticsEmitter.ts` | `server/src/lib/` | Analytics tracking - independente              |
| `formatTime.ts`       | `server/src/lib/` | Utility function - puro                        |
| `resilience.ts`       | `server/src/lib/` | Retry/timeout logic - útil e testado           |

### Backend - Qlik Processing

| Arquivo                 | Localização              | Justificativa                                    |
| ----------------------- | ------------------------ | ------------------------------------------------ |
| `qlikParser.ts`         | `server/src/lib/`        | Parser de sintaxe Qlik - útil e complexo, manter |
| `alignAs.ts`            | `server/src/lib/`        | Auto-fix de AS alignment - funciona              |
| `fixTraceSeparators.ts` | `server/src/lib/`        | Auto-fix de TRACE - funciona                     |
| `qlikValidator.ts`      | `server/src/validators/` | Validação determinística - crítico manter        |
| `scriptAnalyzer.ts`     | `server/src/lib/`        | Análise de complexidade - será usado mais        |

### Backend - LLM Infrastructure

| Arquivo                          | Localização                    | Justificativa                                      |
| -------------------------------- | ------------------------------ | -------------------------------------------------- |
| `providerOrchestrator.ts`        | `server/src/lib/`              | Orquestração de provedores - robusto               |
| `llmClient.ts`                   | `server/src/lib/`              | Client deprecated mas mantido para compatibilidade |
| `llmProviders/googleProvider.ts` | `server/src/lib/llmProviders/` | Provider Gemini - core                             |
| `llmProviders/nvidiaProvider.ts` | `server/src/lib/llmProviders/` | Provider NVIDIA - core                             |
| `llmProviders/types.ts`          | `server/src/lib/llmProviders/` | Type definitions - interfaces                      |

### Backend - Agents (Parcial)

| Arquivo                    | Localização          | Justificativa                                      | Uso Futuro                     |
| -------------------------- | -------------------- | -------------------------------------------------- | ------------------------------ |
| `qlikDocAgent.ts`          | `server/src/agents/` | Geração de documentação - independente do problema | Manter para `/api/scripts/doc` |
| `qlikGranularOptimizer.ts` | `server/src/agents/` | Otimizador granular - feature específica           | Manter (não afeta problema)    |

### Backend - Validators

| Arquivo                 | Localização              | Justificativa                   |
| ----------------------- | ------------------------ | ------------------------------- |
| `requestSchemas.ts`     | `server/src/validators/` | Schemas Zod de request - manter |
| `llmResponseSchemas.ts` | `server/src/validators/` | **SERÁ MODIFICADO** mas mantido |

### Backend - Services

| Arquivo                | Localização            | Justificativa                   |
| ---------------------- | ---------------------- | ------------------------------- |
| `cacheService.ts`      | `server/src/services/` | Cache de otimizações - útil     |
| `authService.ts`       | `server/src/services/` | Autenticação - não relacionado  |
| `emailService.ts`      | `server/src/services/` | Email - não relacionado         |
| `usageQuotaService.ts` | `server/src/services/` | Quotas - não relacionado        |
| `vectorRAGService.ts`  | `server/src/services/` | RAG system - útil para contexto |
| `stepTimingService.ts` | `server/src/services/` | Timing/metrics - útil           |
| `roiCalculator.ts`     | `server/src/services/` | Cálculo ROI - não relacionado   |

### Frontend

| Arquivo                         | Localização  | Justificativa                                   |
| ------------------------------- | ------------ | ----------------------------------------------- |
| **TODOS os arquivos do `web/`** | `web/src/**` | Frontend não precisa mudar - problema é backend |

---

## 🟡 ARQUIVOS MODIFICADOS (Refatoração)

### Etapa 1: Compactação Inteligente

| Arquivo              | Localização       | Mudanças                                                                                                                         |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `promptCompactor.ts` | `server/src/lib/` | ✏️ Preservar 1 linha em branco entre blocos<br>✏️ Não compactar indentação de 4 espaços<br>✏️ Manter estrutura semântica de Qlik |

### Etapa 2: Templates com Regras Condicionais

| Arquivo        | Localização           | Mudanças                                                                                                                                                                       |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `templates.ts` | `server/src/prompts/` | ✏️ Regra LOAD \* condicional (SE schema conhecido)<br>✏️ Adicionar instruções de planejamento mental<br>✏️ Reduzir tamanho total (~30% menor)<br>✏️ Melhorar OUTPUT_RULES_CODE |
| `core.ts`      | `server/src/prompts/` | ✏️ Atualizar GUARDRAILS (remover contradições)<br>✏️ Simplificar instruções<br>✏️ Manter DESIGN_PATTERNS                                                                       |
| `builders.ts`  | `server/src/prompts/` | ✏️ Ajustar buildMegaPrompt para passar contexto completo<br>✏️ Remover limitações artificiais                                                                                  |

### Etapa 3: Agente com Memória Completa

| Arquivo                | Localização          | Mudanças                                                                                                                                                                                         |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `qlikOptimizeAgent.ts` | `server/src/agents/` | ✏️ MAX_HISTORY_TOKENS: 300 → dinâmico (2k-15k)<br>✏️ Passar JSON completo de ANALYSIS para CODE_GEN<br>✏️ Adicionar fallback inteligente se contexto > limite<br>✏️ Melhorar summarizeTaskResult |

### Etapa 4: Parser Tolerante

| Arquivo                 | Localização              | Mudanças                                                                                                                   |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `structuredResponse.ts` | `server/src/lib/`        | ✏️ Adicionar logging detalhado<br>✏️ Melhorar extração de JSON (mais estratégias)<br>✏️ Tolerar campos extras não-críticos |
| `llmResponseSchemas.ts` | `server/src/validators/` | ✏️ Tornar campos opcionais mais permissivos<br>✏️ Adicionar `.passthrough()` onde seguro                                   |

### Etapa 5: Orquestração e Services

| Arquivo               | Localização            | Mudanças                                                                      |
| --------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `optimizerService.ts` | `server/src/services/` | ✏️ Ajustar parâmetros passados aos agentes<br>✏️ Melhorar tratamento de erros |
| `scriptService.ts`    | `server/src/services/` | ✏️ Passar contexto adicional se necessário                                    |

### Etapa 6: Documentação e Scripts

| Arquivo               | Localização | Mudanças                                                 |
| --------------------- | ----------- | -------------------------------------------------------- |
| `README.md` (root)    | `/`         | ✏️ Clarear comandos de execução FE/BE                    |
| `package.json` (root) | `/`         | ✏️ Adicionar scripts separados (`dev:server`, `dev:web`) |
| `server/README.md`    | `server/`   | ✏️ Documentar mudanças arquiteturais                     |
| `web/README.md`       | `web/`      | ✏️ (se necessário)                                       |

---

## 🔴 ARQUIVOS EXCLUÍDOS (Com Justificativa)

### ❌ NENHUM ARQUIVO SERÁ EXCLUÍDO NA FASE 1

**Justificativa:**

1. **Princípio de Segurança**: A refatoração corrige bugs de lógica, não remove features
2. **Risco Zero**: Não há arquivos "mortos" evidentes no escopo do problema
3. **Compatibilidade**: Manter backward compatibility com frontend e APIs existentes

### 📦 Candidatos a Depreciação Futura (Não agora)

| Arquivo                        | Razão                                                                  | Quando Depreciar                              |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------- |
| `qlikConsultancyAgent.ts`      | Se nova arquitetura V2 separar audit de refactor, este vira redundante | Após V2 estável (3-6 meses)                   |
| `llmClient.ts`                 | Deprecated em favor de `providerOrchestrator.ts`                       | Já marcado deprecated, remover quando sem uso |
| Arquivos em `prompts/` antigos | Se criarmos nova estrutura V2, os antigos ficam legado                 | Após migração completa para V2                |

---

## 🏷️ MARCADORES VISUAIS DE CÓDIGO LEGADO

Para facilitar a identificação de código que será depreciado no futuro, usaremos os seguintes marcadores nos arquivos:

### Padrão de Marcação

```typescript
// ⚠️ DEPRECATED: [Razão breve]
// TODO(v2.0): [Ação necessária]
// Migration path: [Novo código/arquivo]
```

### Arquivos com Marcação Necessária

#### 1. `server/src/lib/llmClient.ts`

```typescript
// ⚠️ DEPRECATED: Use providerOrchestrator.ts instead
// TODO(v2.0): Remove after all services migrated to ProviderOrchestrator
// Migration path: import { createOrchestrator } from './providerOrchestrator'
/**
 * @deprecated Use ProviderOrchestrator instead for better resilience and rotation.
 * This client is kept for backward compatibility.
 */
export async function generateStructuredJson(/*...*/): Promise<ProviderResult> {
  // ... código existente
}
```

#### 2. `server/src/agents/qlikConsultancyAgent.ts`

```typescript
// ⚠️ LEGACY: Will be replaced by separate Audit + Refactor agents in v2.0
// TODO(v2.0): Migrate callers to qlikAuditAgent.ts + qlikRefactorAgent.ts
// Migration path: See docs/ARCHITECTURE_V2_PROPOSAL.md
/**
 * Qlik Codex I.A - Agente de Consultoria v3.0 COMPACT & SMART
 *
 * @legacy This agent combines audit and code generation.
 *         In v2.0, these will be separate pipelines for better performance.
 */
export async function runConsultancyAgent(/*...*/) {
  // ... código existente
}
```

#### 3. `server/src/prompts/templates.ts` (seções específicas)

```typescript
// ⚠️ VERBOSE PROMPT: Will be replaced with optimized version in v2.0
// TODO(v2.0): Reduce from ~3500 tokens to ~800 tokens
// Migration path: See server/src/prompts/optimized-templates.ts (to be created)
export const TASK_TEMPLATES: Record<TaskId, string> = {
  CODE_GEN: `## TASK: CODE GENERATION (Apply Plan + Design Patterns)
  
  // ⚠️ PROBLEMATIC RULE: Forces hallucination when schema is unknown
  // TODO(v2.0): Replace with conditional rule
  CODE STANDARDS:
  - Explicit field lists (never LOAD *)  // <-- PROBLEMA AQUI
  
  // ... resto do prompt
  `,
  // ...
};
```

#### 4. `server/src/agents/qlikOptimizeAgent.ts` (seção de memória)

```typescript
// ⚠️ MEMORY BOTTLENECK: 300 chars causes 99% context loss
// TODO(v2.0): Replace with dynamic budget (2k-15k based on script size)
// Migration path: Use calculateContextBudget() function (to be added)
const MAX_HISTORY_TOKENS = 300; // <-- PROBLEMA AQUI

// ⚠️ LEGACY: Summarization loses critical context
// TODO(v2.0): Pass full JSON instead of 2-sentence summary
private summarizeTaskResult(taskName: string, result: unknown): string {
  const maxLen = MAX_HISTORY_TOKENS;

  if (taskName === "ANALYSIS_AND_PLAN") {
    // ⚠️ PROBLEM: Compressing complex analysis into 300 chars
    // ... código de resumo
  }
  // ...
}
```

#### 5. `server/src/lib/promptCompactor.ts` (lógica de compactação)

```typescript
export function compactScriptForPrompt(script: string, minReductionPct = 5) {
  // ... início da função

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      blankStreak += 1;
      // ⚠️ LEGACY: Removes ALL blank lines, destroys block structure
      // TODO(v2.0): Preserve 1 blank line between blocks
      if (blankStreak > 1) continue; // <-- PROBLEMA: deve ser > 1 para permitir 1 linha
      cleaned.push("");
      continue;
    }

    blankStreak = 0;
    // ⚠️ LEGACY: Collapses indentation that's semantically important in Qlik
    // TODO(v2.0): Preserve 4-space indentation
    const collapsed = line.replace(/\s{2,}/g, " "); // <-- PROBLEMA AQUI
    cleaned.push(collapsed);
  }
  // ...
}
```

#### 6. `server/src/lib/structuredResponse.ts`

```typescript
// ⚠️ FRAGILE PARSER: Breaks if LLM adds explanations outside JSON
// TODO(v2.0): Implement robust extraction with multiple fallback strategies
// Migration path: See extractJsonFromLLMResponse() in refactor guide
export function extractJsonFromText(text: string): Record<string, unknown> {
  // ⚠️ PROBLEM: Single strategy, fails if format varies
  // ... código atual
}
```

### Convenções de Marcação

| Marcador         | Significado                                  | Quando Usar                  |
| ---------------- | -------------------------------------------- | ---------------------------- |
| `⚠️ DEPRECATED`  | Código será removido                         | Quando há alternativa pronta |
| `⚠️ LEGACY`      | Código antigo, funciona mas será substituído | Quando precisa refatoração   |
| `⚠️ PROBLEM`     | Bug ou anti-pattern identificado             | Linha específica com issue   |
| `TODO(v2.0)`     | Ação necessária na próxima versão            | Junto com qualquer ⚠️        |
| `Migration path` | Como migrar para novo código                 | Sempre que depreciar algo    |

### Script de Busca de Marcadores

```bash
# Buscar todos os marcadores no código
grep -rn "⚠️" server/src/
grep -rn "TODO(v2.0)" server/src/
grep -rn "DEPRECATED\|LEGACY\|PROBLEM" server/src/

# Contar quantos marcadores existem
grep -r "⚠️" server/src/ | wc -l
```

---

## 📈 Estatísticas

| Categoria                              | Quantidade      |
| -------------------------------------- | --------------- |
| ✅ Arquivos Reutilizados (sem mudança) | ~40 arquivos    |
| ✏️ Arquivos Modificados                | **11 arquivos** |
| ❌ Arquivos Excluídos                  | **0 arquivos**  |
| 📦 Candidatos a depreciação futura     | 3 arquivos      |

---

## 🎯 Impacto da Refatoração

### Por Módulo

| Módulo          | Arquivos Tocados | Risco         |
| --------------- | ---------------- | ------------- |
| **Prompts**     | 3/4 (75%)        | 🟡 Médio      |
| **Agents**      | 1/4 (25%)        | 🟡 Médio-Alto |
| **Lib (Utils)** | 2/13 (15%)       | 🟢 Baixo      |
| **Validators**  | 1/3 (33%)        | 🟢 Baixo      |
| **Services**    | 2/10 (20%)       | 🟢 Baixo      |
| **Routes**      | 0/8 (0%)         | 🟢 Nenhum     |
| **Frontend**    | 0/~50 (0%)       | 🟢 Nenhum     |

### Linha do Tempo de Execução

```
Dia 1: Etapa 1 (promptCompactor) + Etapa 4 (structuredResponse)
       ↓ Teste smoke
Dia 2: Etapa 2 (templates + core + builders)
       ↓ Teste com 10 scripts reais
Dia 3: Etapa 3 (qlikOptimizeAgent)
       ↓ Teste end-to-end completo
Dia 4: Etapa 5 (services) + Etapa 6 (docs)
       ↓ Validação final + Deploy staging
```

---

## 🔍 Validação de "Não-Uso" (Para Remoção Segura Futura)

### Como Verificar se Algo Pode Ser Removido

```bash
# 1. Buscar imports/referências estáticas
grep -r "import.*qlikConsultancyAgent" server/src/
grep -r "from.*qlikConsultancyAgent" server/src/

# 2. Buscar uso dinâmico (strings, require)
grep -r "qlikConsultancyAgent" server/src/

# 3. Verificar se está em rotas ativas
grep -r "consultancy" server/src/routes/

# 4. Rodar build e testes
cd server && npm run build && npm test
```

Se TODOS os comandos retornarem vazio/passar, aí sim pode remover.

---

## ✅ Checklist Pré-Implementação

- [x] Arquivos de infraestrutura core identificados (não tocar)
- [x] Arquivos de problema identificados (modificar)
- [x] Nenhum arquivo será excluído sem evidência
- [x] Plano de rollback por etapa definido
- [x] Scripts de validação documentados
- [ ] **PRONTO PARA INICIAR ETAPA 1**

---

**Próximo Passo:** Começar pela Etapa 1 (promptCompactor.ts) após aprovação.
