import { action } from "./_generated/server";
import { v } from "convex/values";
import { callGemini } from "./lib/llm";

function buildExplainPrompt(
  changes: any[],
  reviewSummary: string | undefined,
  metricsEstimate: any | undefined,
  breakingRisk: string,
  mode: string
): string {
  const changesSummary = changes
    .map((c, idx) => `${idx + 1}. [${c.category.toUpperCase()}] ${c.area}\n   └─ ${c.impact}\n   └─ Risco: ${c.riskLevel}`)
    .join("\n\n");

  const reviewNote = reviewSummary
    ? `\n[REVISÃO] ${reviewSummary}`
    : "";

  const metricsNote = metricsEstimate
    ? `
[MÉTRICAS]
- Complexidade: ${metricsEstimate.loadComplexityBefore} → ${metricsEstimate.loadComplexityAfter}
- Manutenibilidade: ${metricsEstimate.maintainabilityBefore} → ${metricsEstimate.maintainabilityAfter}
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

Risco Geral: ${breakingRisk.toUpperCase()}
Modo de Execução: ${mode.toUpperCase()}

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
`.trim();
}

export const generateExplanation = action({
  args: {
    changes: v.array(v.object({
      category: v.string(),
      area: v.string(),
      impact: v.string(),
      riskLevel: v.string()
    })),
    reviewSummary: v.optional(v.string()),
    metricsEstimate: v.optional(v.object({
      loadComplexityBefore: v.number(),
      loadComplexityAfter: v.number(),
      maintainabilityBefore: v.number(),
      maintainabilityAfter: v.number()
    })),
    breakingRisk: v.string(),
    mode: v.string()
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const prompt = buildExplainPrompt(
      args.changes,
      args.reviewSummary,
      args.metricsEstimate,
      args.breakingRisk,
      args.mode
    );

    const responseText = await callGemini(prompt, apiKey);

    try {
      const data = JSON.parse(responseText);
      return data.explanation;
    } catch (e) {
      console.error("Failed to parse explanation response", e);
      throw new Error("Failed to generate explanation: Invalid JSON response");
    }
  },
});
