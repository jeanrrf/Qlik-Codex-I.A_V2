# 🏗️ Qlik Codex I.A 2.0 - Proposta de Refatoração Arquitetural

**Data:** 21/12/2025  
**Status:** PROPOSTA TÉCNICA  
**Autor:** Auditoria de Engenharia

---

## 📋 Sumário Executivo

### O Problema Atual

O Qlik Codex 1.x sofre de **"Context Pollution"** (Poluição de Contexto) - estamos enviando prompts de 15.000+ tokens para modelos que precisam de instruções cirúrgicas. O resultado:

1. **Modelos "burros"**: LLMs de 675B parâmetros performando como modelos de 7B
2. **Código incompleto**: LOAD statements sem keywords, campos inventados
3. **Alucinações**: Modelo inventa campos que não existem para satisfazer regras impossíveis
4. **Limite artificial de 300 linhas**: Necessário porque o prompt base já consome 80% do budget de tokens

### A Solução Proposta

**Separar responsabilidades em 2 pipelines independentes:**

| Pipeline     | Função               | Input           | Output           | Modelo Ideal                           |
| ------------ | -------------------- | --------------- | ---------------- | -------------------------------------- |
| **AUDIT**    | Análise + Relatório  | Script Completo | JSON (relatório) | Modelos textuais (Gemini Pro)          |
| **REFACTOR** | Otimização de Código | Script Completo | Código Qlik      | Modelos de código (Devstral/Codestral) |

---

## 🎯 Nova Arquitetura: "Qlik Codex 2.0"

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │ Upload Script│───►│ Size Check   │───►│ Mode Selection               │   │
│  │ (File/Paste) │    │ (KB limit)   │    │ ○ Audit Only (free tier+)   │   │
│  └──────────────┘    └──────────────┘    │ ○ Refactor Only (free tier) │   │
│                                          │ ○ Full Analysis (premium)    │   │
│                                          └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    PRE-PROCESSING LAYER (Shared)                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │ │
│  │  │ Size Limit  │  │ Smart Trim  │  │ Qlik Parser │  │ Metrics Calc │  │ │
│  │  │ (KB-based)  │  │ (Block-End) │  │ (AST-like)  │  │ (Real Data)  │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                 ┌──────────────────┴──────────────────┐                     │
│                 ▼                                      ▼                     │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │     AUDIT PIPELINE           │  │       REFACTOR PIPELINE              │ │
│  │  ┌────────────────────────┐  │  │  ┌────────────────────────────────┐  │ │
│  │  │ Prompt: ~800 tokens    │  │  │  │ Prompt: ~600 tokens            │  │ │
│  │  │ - Analyze structure    │  │  │  │ - Apply optimizations          │  │ │
│  │  │ - Detect anti-patterns │  │  │  │ - Preserve ALL logic           │  │ │
│  │  │ - Generate report      │  │  │  │ - Return COMPLETE code         │  │ │
│  │  └────────────────────────┘  │  │  └────────────────────────────────┘  │ │
│  │           │                   │  │           │                          │ │
│  │           ▼                   │  │           ▼                          │ │
│  │  ┌────────────────────────┐  │  │  ┌────────────────────────────────┐  │ │
│  │  │ Model: Gemini 2.5 Pro  │  │  │  │ Model: Devstral-123B / NVIDIA  │  │ │
│  │  │ Output: JSON Report    │  │  │  │ Output: Qlik Script            │  │ │
│  │  │ Tokens: ~2000 out      │  │  │  │ Tokens: ~8000 out              │  │ │
│  │  └────────────────────────┘  │  │  └────────────────────────────────┘  │ │
│  │           │                   │  │           │                          │ │
│  │           ▼                   │  │           ▼                          │ │
│  │  ┌────────────────────────┐  │  │  ┌────────────────────────────────┐  │ │
│  │  │ Output: AuditReport    │  │  │  │ Output: OptimizedScript        │  │ │
│  │  │ - Executive Summary    │  │  │  │ - Complete Qlik code           │  │ │
│  │  │ - Metrics (real)       │  │  │  │ - AS Alignment applied         │  │ │
│  │  │ - Critical Issues      │  │  │  │ - TRACE separators             │  │ │
│  │  │ - Recommendations      │  │  │  │ - Diff stats                   │  │ │
│  │  │ - Risk Assessment      │  │  │  │ - Change summary               │  │ │
│  │  └────────────────────────┘  │  │  └────────────────────────────────┘  │ │
│  └──────────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📏 Nova Métrica de Limite: KB ao invés de Linhas

### Por que KB?

- **Linhas são arbitrárias**: Uma linha pode ter 10 chars ou 500 chars
- **KB é previsível**: 1 KB ≈ 250 tokens (estimativa conservadora)
- **Melhor UX**: "50 KB" é mais intuitivo que "500 linhas"

### Cálculo de Limites

| Tier           | Limite | Tokens Estimados | Linhas Médias Equivalentes |
| -------------- | ------ | ---------------- | -------------------------- |
| **Free Tier**  | 50 KB  | ~12.500 tokens   | ~600-800 linhas            |
| **Pro Tier**   | 200 KB | ~50.000 tokens   | ~2.500-3.500 linhas        |
| **Enterprise** | 500 KB | ~125.000 tokens  | ~6.000-8.000 linhas        |

### Validação de Tamanho (Shared Pre-Processing)

```typescript
// Nova função de validação por tamanho
interface SizeValidation {
  sizeKB: number;
  isWithinLimit: boolean;
  tier: "free" | "pro" | "enterprise";
  maxAllowedKB: number;
  estimatedTokens: number;
}

function validateScriptSize(script: string, userTier: string): SizeValidation {
  const sizeBytes = new TextEncoder().encode(script).length;
  const sizeKB = Math.round((sizeBytes / 1024) * 10) / 10;

  const limits = {
    free: 50,
    pro: 200,
    enterprise: 500,
  };

  const maxAllowedKB = limits[userTier] || limits.free;

  return {
    sizeKB,
    isWithinLimit: sizeKB <= maxAllowedKB,
    tier: userTier as "free" | "pro" | "enterprise",
    maxAllowedKB,
    estimatedTokens: Math.round(sizeKB * 250), // ~250 tokens per KB
  };
}
```

---

## 📝 Novos Prompts: Curtos, Diretos, Poderosos

### PROMPT AUDIT (Análise Apenas)

**Objetivo:** Extrair métricas e gerar relatório SEM GERAR CÓDIGO
**Tokens estimados:** ~800 (vs ~3000 atual)

```typescript
export const PROMPT_AUDIT = `You are a Qlik Sense code auditor.
Analyze the script and return JSON with findings.

RULES:
- DO NOT generate or modify code
- DO NOT suggest specific code changes
- ONLY analyze and report metrics
- Output in PT-BR

ANALYZE:
1. Structure: tables, joins, loads count
2. Anti-patterns: LOAD *, missing DROP, synthetic key risks
3. Complexity: cyclomatic score (1-100)
4. Maintainability: index (0-100)
5. Critical issues (severity: critical/high/medium/low)

OUTPUT JSON:
{
  "summary": "2-3 sentence overview",
  "metrics": {
    "lines": number,
    "tables": number,
    "loads": number,
    "joins": number,
    "complexity": number,
    "maintainability": number
  },
  "issues": [
    { "type": string, "severity": string, "description": string }
  ],
  "recommendations": [
    { "title": string, "priority": string, "action": string }
  ],
  "risk": "none" | "low" | "medium" | "high"
}`;
```

### PROMPT REFACTOR (Código Apenas)

**Objetivo:** Gerar código otimizado SEM RELATÓRIO EXTENSO
**Tokens estimados:** ~600 (vs ~4500 atual)

```typescript
export const PROMPT_REFACTOR = `You are a Qlik Sense code optimizer.
Return ONLY the optimized script. No explanations needed.

CRITICAL RULES:
1. Output MUST be complete, valid Qlik script
2. Every LOAD must have: fields, source (FROM/RESIDENT/INLINE/SQL)
3. NEVER remove LOAD keyword or data source
4. PRESERVE all field names, table names, variables EXACTLY
5. If unsure about a change, keep original code

APPLY:
- Remove redundant loads
- Optimize JOIN order
- Add DROP for temp tables
- Align AS keywords vertically
- Add TRACE separators between blocks

DO NOT:
- Invent fields that don't exist
- Remove subroutines (SUB/END SUB)
- Change business logic or calculations
- Remove LOAD * if source schema is unknown

OUTPUT JSON:
{
  "optimizedScript": "COMPLETE_QLIK_CODE_HERE",
  "changes": [
    { "area": string, "impact": string }
  ]
}`;
```

---

## 🗂️ Estrutura de Arquivos Proposta

```
server/src/
├── agents/
│   ├── qlikAuditAgent.ts      # NOVO: Apenas análise
│   ├── qlikRefactorAgent.ts   # NOVO: Apenas código
│   └── [deprecated]/
│       ├── qlikOptimizeAgent.ts
│       └── qlikConsultancyAgent.ts
├── prompts/
│   ├── audit.ts               # NOVO: Prompt de auditoria
│   ├── refactor.ts            # NOVO: Prompt de refatoração
│   ├── shared.ts              # NOVO: Regras compartilhadas
│   └── [deprecated]/
│       ├── core.ts
│       ├── templates.ts
│       └── builders.ts
├── services/
│   ├── auditService.ts        # NOVO: Orquestra audit pipeline
│   ├── refactorService.ts     # NOVO: Orquestra refactor pipeline
│   └── [deprecated]/
│       └── optimizerService.ts
├── routes/
│   ├── audit.routes.ts        # NOVO: POST /api/scripts/audit
│   ├── refactor.routes.ts     # NOVO: POST /api/scripts/refactor
│   └── scripts.routes.ts      # ATUALIZADO: Mantém /optimize como combo
└── lib/
    ├── sizeValidator.ts       # NOVO: Validação por KB
    └── smartTruncator.ts      # ATUALIZADO: Corte inteligente por blocos
```

---

## 🔄 Migração de APIs

### Endpoints Atuais (v1)

```
POST /api/scripts/optimize   # Faz tudo (análise + código + relatório)
POST /api/scripts/doc        # Documentação
```

### Endpoints Propostos (v2)

```
POST /api/scripts/audit      # NOVO: Apenas análise (JSON report)
POST /api/scripts/refactor   # NOVO: Apenas código (optimized script)
POST /api/scripts/optimize   # MANTIDO: Combo (audit + refactor)
POST /api/scripts/doc        # MANTIDO: Documentação
```

---

## 📊 Comparativo de Tokens

### Cenário: Script de 300 linhas (~15 KB)

| Componente          | v1 (Atual)    | v2 (Proposto) | Redução |
| ------------------- | ------------- | ------------- | ------- |
| **System Prompt**   | ~3.500 tokens | ~600 tokens   | 83%     |
| **Guardrails**      | ~800 tokens   | ~150 tokens   | 81%     |
| **Design Patterns** | ~1.200 tokens | ~100 tokens   | 92%     |
| **Output Schema**   | ~500 tokens   | ~100 tokens   | 80%     |
| **Script Input**    | ~3.750 tokens | ~3.750 tokens | 0%      |
| **TOTAL INPUT**     | ~9.750 tokens | ~4.700 tokens | **52%** |

### Impacto no Output

| Modo         | v1 Output                     | v2 Output                   |
| ------------ | ----------------------------- | --------------------------- |
| **Audit**    | ~8.000 tokens (report + code) | ~2.000 tokens (report only) |
| **Refactor** | ~8.000 tokens (report + code) | ~4.000 tokens (code only)   |

---

## 💰 Impacto no Free Tier

### Atual (v1)

- Limite: 300 linhas (~7.5 KB)
- Tokens por request: ~18.000 (input + output)
- Custo estimado: $0.018 por request (Gemini)

### Proposto (v2)

- Limite: 50 KB (~800 linhas)
- Tokens por request (Audit): ~6.700
- Tokens por request (Refactor): ~8.700
- Custo estimado: $0.007-0.009 por request

**Resultado:** **2.6x mais linhas por 50% do custo**

---

## 🚀 Plano de Implementação

### Fase 1: Infraestrutura (1-2 dias)

- [ ] Criar `sizeValidator.ts`
- [ ] Criar `audit.ts` e `refactor.ts` (prompts)
- [ ] Criar `qlikAuditAgent.ts`
- [ ] Criar `qlikRefactorAgent.ts`

### Fase 2: Backend Routes (1 dia)

- [ ] Criar `audit.routes.ts`
- [ ] Criar `refactor.routes.ts`
- [ ] Atualizar `scripts.routes.ts` para usar novos agents

### Fase 3: Frontend (1-2 dias)

- [ ] Atualizar seletor de modo (3 opções)
- [ ] Criar view específica para Audit (sem code diff)
- [ ] Criar view específica para Refactor (com code diff)
- [ ] Atualizar indicadores de quota

### Fase 4: Deprecação (1 dia)

- [ ] Mover arquivos antigos para `/deprecated`
- [ ] Atualizar imports
- [ ] Rodar testes de regressão

---

## ✅ Critérios de Sucesso

1. **Código Completo**: 0% de scripts com LOAD incompleto
2. **Sem Alucinações**: 0% de campos inventados
3. **Performance**: Redução de 50%+ nos tokens consumidos
4. **UX**: Limite de 50 KB no free tier (vs 7.5 KB atual)
5. **Qualidade**: Mesma ou melhor qualidade de análise

---

## 📎 Anexos

### A. Schema Zod para Audit Response

```typescript
export const AuditResponseSchema = z.object({
  summary: z.string().max(500),
  metrics: z.object({
    lines: z.number(),
    tables: z.number(),
    loads: z.number(),
    joins: z.number(),
    complexity: z.number().min(0).max(100),
    maintainability: z.number().min(0).max(100),
  }),
  issues: z
    .array(
      z.object({
        type: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        description: z.string(),
      })
    )
    .max(10),
  recommendations: z
    .array(
      z.object({
        title: z.string(),
        priority: z.enum(["critical", "high", "medium", "low"]),
        action: z.string(),
      })
    )
    .max(5),
  risk: z.enum(["none", "low", "medium", "high"]),
});
```

### B. Schema Zod para Refactor Response

```typescript
export const RefactorResponseSchema = z.object({
  optimizedScript: z.string().min(10),
  changes: z
    .array(
      z.object({
        area: z.string(),
        impact: z.string(),
      })
    )
    .max(8),
});
```

---

**Próximo Passo:** Aprovação desta proposta para iniciar implementação.
