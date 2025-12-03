import { defaultOrchestrator } from "../lib/providerOrchestrator";
import { logger } from "../lib/logger";
import { OptimizeResult } from "../types/qlik";
import type { LLMOptions } from "../types/optimization";

function buildExplainPrompt(result: OptimizeResult): string {
  const changesSummary = result.analysis.changes
    .map((c, idx) => `${idx + 1}. [${c.category.toUpperCase()}] ${c.area}\n   └─ ${c.impact}\n   └─ Risco: ${c.riskLevel}`)
    .join("\n\n");

  const reviewNote = result.review
    ? `\n[REVISÃO] ${result.review.summary}`
    : "";

  const metricsNote = result.analysis.metricsEstimate
    ? `
[MÉTRICAS]
- Complexidade: ${result.analysis.metricsEstimate.loadComplexityBefore} → ${result.analysis.metricsEstimate.loadComplexityAfter}
- Manutenibilidade: ${result.analysis.metricsEstimate.maintainabilityBefore} → ${result.analysis.metricsEstimate.maintainabilityAfter}
`
    : "";

  return `
═══════════════════════════════════════════════════════════════════
AINEX QLIK EXPLAINER — v2.0 (Pipeline-Aware Documentation)
═══════════════════════════════════════════════════════════════════
Projeto: QLIK CODEX I.A

PAPEL E CONTEXTO
Você é Instrutor Sênior de Qlik executando a etapa OPT_003_DOCUMENTATION.
Sua entrada são mudanças aplicadas/validadas nas etapas anteriores (OPT_001 + OPT_002).
Seu objetivo: documentar DIDATICAMENTE o que foi feito, para desenvolvedores Qlik.

VOCÊ NÃO INVENTA MUDANÇAS - APENAS EXPLICA O QUE JÁ FOI APLICADO.

═══════════════════════════════════════════════════════════════════
MUDANÇAS APLICADAS (FORNECIDAS PELO PIPELINE)
═══════════════════════════════════════════════════════════════════
${changesSummary}
${reviewNote}
${metricsNote}

Risco Geral: ${result.analysis.breakingRisk.toUpperCase()}
Modo de Execução: ${result.analysis.mode.toUpperCase()}

═══════════════════════════════════════════════════════════════════
DIRETRIZES DE DOCUMENTAÇÃO
═══════════════════════════════════════════════════════════════════

## 🎯 TOM E ESTILO
  - Tom: Profissional, educativo, encorajador
  - Foco: VALOR gerado (performance, clareza, manutenção)
  - Linguagem: Técnica mas acessível para devs Qlik júnior/pleno
  - Tamanho: 2-4 parágrafos compactos (150-300 palavras)

## 📝 ESTRUTURA DA EXPLICAÇÃO
  1. ABERTURA: Resuma o tipo de otimização (performance, estrutura, limpeza)
  2. DETALHAMENTO: Cite 2-3 mudanças principais com justificativa técnica
  3. IMPACTO: Explique benefícios concretos (ex: "redução de I/O", "melhor legibilidade")
  4. PRÓXIMOS PASSOS: Se risco MEDIUM/HIGH, sugira testes de validação

## 🚫 O QUE EVITAR
  ❌ Inventar mudanças não listadas acima
  ❌ Números de performance inventados (ex: "50% mais rápido" sem base)
  ❌ Jargões vazios ("código mais clean", "melhor performance" sem especificar)
  ❌ Texto genérico que poderia se aplicar a qualquer script

## ✅ O QUE INCLUIR
  ✓ Cite anti-patterns resolvidos pelo código (ex: "eliminado SELECT *")
  ✓ Referencie áreas específicas modificadas (ex: "tabela VENDAS, seção JOIN")
  ✓ Mencione trade-offs se houver (ex: "maior clareza mas 2 linhas a mais")
  ✓ Destaque se modo foi ANALYSIS (apenas diagnóstico) ou ULTRA-EXPERT (código alterado)

═══════════════════════════════════════════════════════════════════
FORMATO DE RESPOSTA JSON (SCHEMA OBRIGATÓRIO)
═══════════════════════════════════════════════════════════════════
Responda APENAS com JSON puro, sem markdown, sem \`\`\`, sem texto extra.

{
  "explanation": "Texto em Markdown (2-4 parágrafos) documentando as mudanças aplicadas"
}

EXEMPLO DE BOA EXPLICAÇÃO:
---
## Resumo da Otimização

Este script passou por refatoração estrutural focada em **redução de complexidade ciclomática** e **eliminação de anti-patterns de performance**. As principais intervenções foram realizadas na tabela VENDAS (seção de carga principal) e no bloco de transformação de datas.

### Mudanças Principais

1. **Remoção de SELECT *** na consulta SQL VENDAS: foram listados explicitamente 12 campos necessários, eliminando 8 campos de metadados não utilizados (ID_Sistema, Hash_MD5, etc.). Isso reduz payload de rede e carga de RAM.

2. **Refatoração de IF aninhado** (7 níveis) para Pick(Match()) no bloco de mapeamento de mês: a complexidade ciclomática foi reduzida de 18 para 8, melhorando legibilidade e maintainability index.

### Impacto e Próximos Passos

O risco é classificado como **LOW**, pois não houve alteração em lógica de negócio ou chaves de associação. Recomenda-se teste de QA para validar que os 12 campos carregados são suficientes para todas as expressões frontend.
---

AGORA GERE SUA EXPLICAÇÃO BASEADA NAS MUDANÇAS FORNECIDAS ACIMA.
═══════════════════════════════════════════════════════════════════
`.trim();
}

export async function runQlikExplainAgent(
  result: OptimizeResult,
  llmOptions?: LLMOptions
): Promise<string> {
  const prompt = buildExplainPrompt(result);

  try {
    // Usamos generateStructuredJson mas pegamos apenas o text, pois o prompt pede texto livre (ou poderíamos pedir JSON com campo 'explanation')
    // Para simplificar e garantir que o llmClient funcione bem, vamos pedir um JSON simples com "explanation".

    const jsonPrompt = `${prompt}\n\nResponda APENAS com um JSON: { "explanation": "seu texto aqui" }`;

    const orchestratorResult = await defaultOrchestrator.executeWithRotation(
      "result_108_generate_explanation",
      jsonPrompt,
      45000 // 45s timeout
    );

    if (orchestratorResult.fallbackTriggered || !orchestratorResult.result) {
      return "Não foi possível gerar a explicação (todos os provedores falharam).";
    }

    const text = orchestratorResult.result;
    const parsed = JSON.parse(text);
    return parsed.explanation || "Explicação não encontrada.";

  } catch (err) {
    logger.error("Erro no Explain Agent", { error: String(err) });
    return "Erro ao gerar explicação.";
  }
}
