# Agent Super-Prompts Refactor v4.0 - Documentation

**Date**: 2024-01-XX  
**Status**: ✅ Completed  
**Authorization**: User-approved full refactoring

---

## 📋 Overview

Comprehensive refactoring of all LLM agent super-prompts from generic "6-stage process" (v3.0) to **pipeline-aware engineering quality** (v4.0). Goal: eliminate generic LLM responses and anchor all outputs to real metrics and anti-patterns detected by the system.

---

## 🎯 Refactoring Goals

### ❌ Before (v3.0 Problems)
- Generic prompts like "ETAPA 1: Análise" without context
- LLM responses not anchored to real data (parser output, metrics)
- No explicit pipeline stage mapping (opt_001, opt_002, etc.)
- Changes without specific anti-pattern or metric citations
- Risk assessment without concrete justification

### ✅ After (v4.0 Solutions)
- Explicit pipeline stage mapping (OPT_001 → OPT_005, ANA_001 → ANA_004)
- **Mandatory anchoring**: Every `change.impact` must cite [APATTERN-XXX] or metric delta
- Anti-hallucination guards strengthened (SQL functions, Set Analysis, etc.)
- Mode-aware instructions (analysis = read-only, ultra-expert = rewrite)
- Quality examples showing good vs bad responses

---

## 🔧 Refactored Agents

### 1. qlikOptimizeAgent.ts (Core Optimization Agent)

**File**: `server/src/agents/qlikOptimizeAgent.ts`  
**Function**: `buildSuperPrompt(script: string, mode: OptimizeMode): string`

#### Key Changes

##### Header Section (Lines 17-70)
**Before**:
```
PAPEL E IDENTIDADE
Você é a AINEX, especialista em Qlik Script...
PROCESSO DE OTIMIZAÇÃO EM 6 ETAPAS
ETAPA 1: ANÁLISE E DIAGNÓSTICO...
```

**After**:
```
SEU PAPEL (AGENTE DE OTIMIZAÇÃO QLIK)
Você é a AINEX, especialista sênior com foco em:
- Análise quantitativa de performance e complexidade
- Detecção automática de anti-patterns
- Otimização baseada em evidências (métricas LOC, joins, complexity)

PIPELINE DE ANÁLISE (ETAPAS OPT_001 → OPT_005)
[OPT_001] ANÁLISE PROFUNDA (já executada antes desta chamada)
  ├─ opt_001_parse: Parser extraiu tabelas, joins, variáveis
  ├─ opt_001_antipatterns: Detectados SELECT *, Cartesian, Synthetic Keys
  ├─ opt_001_metrics: Calculados MI, CC, LOC
  └─ opt_001_llm: VOCÊ ESTÁ AQUI — gere otimizações baseadas nisso
```

**Impact**: LLM now understands it's part of a larger pipeline and has access to pre-computed data.

##### Anti-Pattern Section (Lines 135-165)
**Before**:
```
## 🔎 Detecção de Anti-Padrões
• "SELECT *" → Listar campos explícitos
• Cartesian product → Adicionar JOIN ON
```

**After**:
```
## 🔎 ANTI-PATTERNS DETECTÁVEIS (cite ao justificar mudanças)
[APATTERN-001] SELECT * → Liste campos (ganho: -20% payload, +maintainability)
[APATTERN-002] Cartesian product → JOIN ON (risco: data explosion)
[APATTERN-003] Synthetic keys → Chave composta (risco: model ambiguity)
...
[APATTERN-010] Non-SARGable WHERE → Reescreva (ganho: +80% DB speed)
```

**Impact**: Provides exact anti-pattern codes for citation in `change.impact` field.

##### Metrics-Based Optimization (Lines 166-172)
**NEW SECTION**:
```
## ⚡ OTIMIZAÇÕES BASEADAS EM MÉTRICAS (cite números ao propor)
- Se LOC > 500 + CC > 15 → Modularize (Target: CC < 10)
- Se comment_ratio < 5% → Adicione docstrings
- Se maintainability_index < 50 → Refatore (Target: MI > 65)
- Se unused_variables > 10 → Limpe SET/LET não referenciados
```

**Impact**: Explicit thresholds for triggering optimizations.

##### JSON Schema Requirements (Lines 200-230)
**Before**:
```
{
  "impact": "Explicação ESPECÍFICA do benefício",
  "before": "Código EXATO antes",
  "after": "Código EXATO depois"
}
```

**After**:
```
{
  "impact": "CITE: [APATTERN-XXX] ou métrica (LOC -30%, CC -5 pontos) + justificativa",
  "before": "Código EXATO antes (5-15 linhas com contexto)",
  "after": "Código EXATO depois (5-15 linhas com contexto)"
}

REGRAS DE QUALIDADE:
✓ Campo "impact" DEVE citar [APATTERN-XXX] ou métrica específica
✓ Campo "metrics_estimate.notes" DEVE incluir números (LOC delta, CC delta)
```

**Impact**: Forces structured, measurable outputs.

##### Quality Examples (Lines 240-270)
**NEW SECTION**:
```
❌ RUIM (genérico, sem ancoragem):
{
  "impact": "Melhora a performance geral do script"
}

✅ BOM (específico, ancorado em anti-pattern):
{
  "impact": "Detectado [APATTERN-004] LOAD * RESIDENT: removidos 8 campos, estimativa -15% RAM"
}

✅ EXCELENTE (ancorado em métrica real):
{
  "impact": "CC detectado em 18 (threshold: 10). Refatorado, redução: CC -10 pontos, MI +15"
}
```

**Impact**: Provides concrete examples of expected quality.

---

### 2. qlikReviewAgent.ts (Code Review Agent)

**File**: `server/src/agents/qlikReviewAgent.ts`  
**Function**: `buildReviewPrompt(original: string, optimized: string): string`

#### Key Changes

##### Header Section (Lines 9-20)
**Before**:
```
AINEX QLIK REVIEWER — CODE REVIEW v1.0
PAPEL: Arquiteto Sênior de Qlik
OBJETIVO: Identificar riscos e erros de lógica
```

**After**:
```
AINEX QLIK REVIEWER — v2.0 (Pipeline-Aware Review)
PAPEL E CONTEXTO:
Você é Arquiteto Sênior executando etapa OPT_002_REVIEW.
Sua entrada são mudanças propostas pelo agente OPT_001.
Seu objetivo: validar segurança, integridade, corretude.

VOCÊ NÃO ESTÁ FAZENDO OTIMIZAÇÃO - APENAS REVISÃO CRÍTICA.
```

**Impact**: Clear role definition within the pipeline.

##### Mandatory Checklist (Lines 25-50)
**NEW SECTION**:
```
CHECKLIST DE REVISÃO MANDATÓRIO

## 🔒 SEGURANÇA E INTEGRIDADE (PRIORIDADE MÁXIMA)
✓ Lógica de negócio preservada? (WHERE, IF, JOIN inalterados)
✓ Chaves de associação intactas? (link fields não renomeados sem propagação)
✓ Fontes corretas? (lib://, QVD paths não alterados)
✓ Comandos destrutivos justificados? (DROP TABLE/FIELD com propósito)
✓ Preceding LOAD válidos? (todo LOAD sem fonte → SQL SELECT ou RESIDENT)

## ⚠️ VALIDAÇÃO DE SINTAXE (Anti-Hallucination)
✓ Nenhuma função SQL fora de SQL SELECT? (CASE, DATEDIFF, NVL)
✓ Nenhum Set Analysis no script? ({<...>} é frontend-only)
✓ Apenas funções Qlik nativas? (If, Alt, Pick, Match, Mid, Today)
```

**Impact**: Systematic validation prevents breaking changes.

##### Risk Classification (Lines 55-65)
**Before**:
```
CLASSIFICAÇÃO DE RISCO
- BAIXO: Formatação, comentários
- MÉDIO: Remoção de campos
- ALTO: Alteração de JOINs
```

**After**:
```
CLASSIFICAÇÃO DE RISCO (RECOMENDAÇÃO FINAL)
- **NONE**: Nenhuma mudança ou apenas whitespace
- **LOW**: Limpeza segura (variáveis não usadas, campos validados)
- **MEDIUM**: Refatoração sem tocar lógica crítica (renomeações propagadas)
- **HIGH**: Alteração de JOINs, WHERE, transformações, ou sintaxe suspeita

SE DETECTAR ERRO CRÍTICO: Marque "high" + explique linha/bloco errado.
```

**Impact**: Precise risk definitions with clear escalation rules.

---

### 3. qlikExplainAgent.ts (Documentation Agent)

**File**: `server/src/agents/qlikExplainAgent.ts`  
**Function**: `buildExplainPrompt(result: OptimizeResult): string`

#### Key Changes

##### Header Section (Lines 10-25)
**Before**:
```
AINEX QLIK EXPLAINER — DIDACTIC EXPLANATION v1.0
PAPEL: Instrutor especialista em Qlik
OBJETIVO: Explicar O QUE mudou e POR QUE mudou
```

**After**:
```
AINEX QLIK EXPLAINER — v2.0 (Pipeline-Aware Documentation)
PAPEL E CONTEXTO:
Você é Instrutor Sênior executando etapa OPT_003_DOCUMENTATION.
Sua entrada: mudanças aplicadas/validadas (OPT_001 + OPT_002).
Seu objetivo: documentar DIDATICAMENTE para desenvolvedores Qlik.

VOCÊ NÃO INVENTA MUDANÇAS - APENAS EXPLICA O QUE JÁ FOI APLICADO.
```

**Impact**: Clear constraint: no hallucination, only document real changes.

##### Input Data Structure (Lines 11-30)
**NEW SECTION**:
```
MUDANÇAS APLICADAS (FORNECIDAS PELO PIPELINE)
${changesSummary}  // Now formatted with index, category, impact, risk
${reviewNote}      // Review agent's validation result
${metricsNote}     // Before/after metrics comparison

Risco Geral: ${result.analysis.breakingRisk.toUpperCase()}
Modo: ${result.analysis.mode.toUpperCase()}
```

**Impact**: All context provided upfront, no guessing required.

##### Documentation Guidelines (Lines 35-60)
**NEW SECTION**:
```
DIRETRIZES DE DOCUMENTAÇÃO

## 🎯 TOM E ESTILO
- Tom: Profissional, educativo, encorajador
- Foco: VALOR gerado (performance, clareza, manutenção)
- Linguagem: Técnica mas acessível (júnior/pleno)
- Tamanho: 2-4 parágrafos compactos (150-300 palavras)

## 🚫 O QUE EVITAR
❌ Inventar mudanças não listadas
❌ Números fake ("50% mais rápido" sem base)
❌ Jargões vazios ("código mais clean" sem especificar)
❌ Texto genérico (aplicável a qualquer script)

## ✅ O QUE INCLUIR
✓ Cite anti-patterns resolvidos ("eliminado SELECT *")
✓ Referencie áreas específicas ("tabela VENDAS, seção JOIN")
✓ Mencione trade-offs ("maior clareza mas 2 linhas a mais")
✓ Destaque modo (ANALYSIS = diagnóstico, ULTRA-EXPERT = alterado)
```

**Impact**: Forces specific, actionable documentation.

##### Quality Example (Lines 80-105)
**NEW SECTION**:
```
EXEMPLO DE BOA EXPLICAÇÃO:
---
## Resumo da Otimização

Este script passou por refatoração estrutural focada em **redução de complexidade 
ciclomática** e **eliminação de anti-patterns de performance**. Principais intervenções 
na tabela VENDAS e bloco de transformação de datas.

### Mudanças Principais

1. **Remoção de SELECT *** na SQL VENDAS: listados explicitamente 12 campos, 
   eliminando 8 metadados não utilizados. Reduz payload de rede e RAM.

2. **Refatoração de IF aninhado** (7 níveis) para Pick(Match()): complexidade 
   ciclomática reduzida de 18 para 8, melhorando MI.

### Impacto e Próximos Passos

Risco **LOW** (sem alteração em lógica de negócio). Recomenda-se teste QA para 
validar que 12 campos são suficientes para expressões frontend.
---
```

**Impact**: Concrete template for quality documentation.

---

## 📊 Quantitative Improvements

| Metric | Before (v3.0) | After (v4.0) | Improvement |
|--------|---------------|--------------|-------------|
| **Pipeline Awareness** | Generic "ETAPA 1-6" | Explicit OPT_001-005 mapping | 🟢 Context clarity |
| **Anti-Pattern Citations** | Optional, vague | Mandatory [APATTERN-XXX] codes | 🟢 Traceability |
| **Metric Anchoring** | "Melhora performance" | "LOC -30%, CC -5 points" | 🟢 Measurability |
| **Quality Examples** | None | 3 tiers (bad/good/excellent) | 🟢 Output quality |
| **Anti-Hallucination** | Basic warnings | Systematic checklist + examples | 🟢 Reliability |
| **Risk Classification** | 4 vague levels | 4 precise levels + criteria | 🟢 Safety |

---

## 🧪 Testing Recommendations

### Unit Tests (Priority: HIGH)
1. **qlikOptimizeAgent.spec.ts**: Validate that `changes[].impact` contains either `[APATTERN-` or metric keywords (`LOC`, `CC`, `MI`)
2. **qlikReviewAgent.spec.ts**: Test that `recommended_risk` escalates correctly when critical issues detected
3. **qlikExplainAgent.spec.ts**: Verify explanation references specific changes from input (no hallucinated optimizations)

### Integration Tests (Priority: MEDIUM)
1. **Full Pipeline**: Run analysis mode with test script → verify substep timing → check consultancy report format
2. **Ultra-Expert Mode**: Run optimization → validate Review agent catches breaking changes → verify Explain agent documents only applied changes

### Regression Tests (Priority: HIGH)
1. **Golden Scripts**: Run against 5-10 production scripts from `test/fixtures/`
2. **Compare Outputs**: v3.0 vs v4.0 response quality (generic vs specific)
3. **Breaking Changes**: Verify no functional regressions (still produces valid JSON schemas)

---

## 🚀 Deployment Checklist

- [x] **TypeScript Compilation**: `npx tsc --noEmit` passes (validated)
- [x] **Linting**: ESLint rules compliant
- [ ] **Unit Tests**: Update test expectations for new prompt structure
- [ ] **Integration Tests**: Full pipeline smoke test
- [ ] **Documentation**: Update `README.md` to reflect v4.0 changes
- [ ] **Changelog**: Add entry in `CHANGELOG.md` for prompt refactor
- [ ] **User Communication**: Notify users of improved output quality

---

## 📚 Related Files

### Modified Files
- `server/src/agents/qlikOptimizeAgent.ts` (Lines 17-270)
- `server/src/agents/qlikReviewAgent.ts` (Lines 9-120)
- `server/src/agents/qlikExplainAgent.ts` (Lines 1-110)

### Dependent Files (No Changes Required)
- `server/src/services/optimizerService.ts` (calls agents, already correct)
- `server/src/validators/llmResponseSchemas.ts` (schemas unchanged)
- `server/src/types/optimization.ts` (types unchanged)

### Documentation Files
- `.github/copilot-instructions.md` (already documented AINEX pipeline)
- `server/README.md` (consider adding "Prompt Engineering" section)

---

## 🔍 Future Improvements

1. **Dynamic Knowledge Injection**: Instead of hardcoded [APATTERN-001] through [APATTERN-010], inject actual anti-patterns detected by parser
2. **Metric Thresholds Config**: Move thresholds (LOC > 500, CC > 15) to `config.ts` for tuning
3. **LLM Response Validation**: Add Zod schema to validate that `impact` field contains required citations
4. **Prompt Versioning**: Add version field to LLM request for tracking which prompt version generated each response
5. **A/B Testing Framework**: Compare v3.0 vs v4.0 outputs on same scripts to measure quality improvement

---

## 📝 Notes

- **User Authorization**: User explicitly authorized refactoring with "autotizado" after reviewing approach
- **No Breaking Changes**: All TypeScript interfaces and function signatures remain unchanged
- **Backward Compatible**: Old responses (if any cached) still parse correctly, just less specific
- **LLM Provider Agnostic**: Improvements apply to both Google Gemini and NVIDIA backends

---

**Version**: 4.0  
**Author**: GitHub Copilot (supervised refactoring)  
**Review**: Pending user validation with real scripts  
**Status**: ✅ Implementation Complete, ⏳ Testing Pending
