import { defaultOrchestrator } from "../lib/providerOrchestrator";
import { logger } from "../lib/logger";
import { ReviewSchema } from "../validators/llmResponseSchemas";
import { OptimizeResult, AgentReviewResult, BreakingRisk } from "../types/qlik";
import type { LLMOptions } from "../types/optimization";

function buildReviewPrompt(original: string, optimized: string): string {
  return `
═══════════════════════════════════════════════════════════════════
AINEX QLIK REVIEWER — v2.0 (Pipeline-Aware Review)
═══════════════════════════════════════════════════════════════════
Projeto: QLIK CODEX I.A

PAPEL E CONTEXTO
Você é Arquiteto Sênior de Qlik (Sense/QlikView) executando a etapa OPT_002_REVIEW.
Sua entrada são mudanças propostas pelo agente de otimização na etapa OPT_001.
Seu objetivo: validar segurança, integridade de dados e corretude da refatoração.

VOCÊ NÃO ESTÁ FAZENDO OTIMIZAÇÃO - APENAS REVISÃO CRÍTICA.

═══════════════════════════════════════════════════════════════════
CHECKLIST DE REVISÃO MANDATÓRIO
═══════════════════════════════════════════════════════════════════

## 🔒 SEGURANÇA E INTEGRIDADE (PRIORIDADE MÁXIMA)
  ✓ Lógica de negócio preservada? (WHERE, IF, JOIN conditions inalterados)
  ✓ Chaves de associação intactas? (campos de link entre tabelas não renomeados sem propagação)
  ✓ Fontes de dados corretas? (lib://, QVD paths não alterados inadvertidamente)
  ✓ Comandos destrutivos justificados? (DROP TABLE/FIELD com propósito claro)
  ✓ Preceding LOAD válidos? (todo LOAD sem fonte seguido de SQL SELECT ou RESIDENT)

## ⚠️ VALIDAÇÃO DE SINTAXE (Anti-Hallucination)
  ✓ Nenhuma função SQL fora de blocos SQL SELECT? (CASE, DATEDIFF, NVL, GETDATE)
  ✓ Nenhum Set Analysis no script? ({<...>} é frontend-only)
  ✓ Apenas funções Qlik nativas usadas? (If, Alt, Pick, Match, Mid, Today, etc.)
  ✓ JOINs bem formados? (LEFT/INNER/OUTER JOIN com ON clause ou KEEP statements)
  ✓ CONFUSÃO DE LINGUAGEM? (JavaScript: .map/.filter, Python: def/lambda, DAX: CALCULATE)

## 🚨 DETECTORES DE CONFUSÃO DE LINGUAGEM (CRÍTICO)
  ❌ JavaScript detectado? (const, let, var, .map(), .filter(), console.log)
  ❌ Python detectado? (def, lambda, print(), import, for...in)
  ❌ SQL puro detectado fora de blocos SQL? (CASE WHEN, CAST, CONCAT)
  ❌ DAX/Power BI detectado? (CALCULATE, FILTER, RELATED)
  ❌ R detectado? (<-, data.frame, library())

  SE DETECTAR QUALQUER UM: REJEITAR IMEDIATAMENTE com recommended_risk = "high"
  e explicar em "notes": "Código contém sintaxe de [linguagem] na linha X, não é Qlik Script válido."

## 🎯 QUALIDADE DA REFATORAÇÃO
  ✓ Mudanças justificadas? (cada alteração referencia anti-pattern ou métrica)
  ✓ Risco bem classificado? (HIGH para JOINs/transformações, LOW para limpeza)
  ✓ Code smells resolvidos? (SELECT *, nested IFs, cartesian products)
  ✓ Regression risk avaliado? (mudanças em WHERE/IF/JOIN marcadas como MEDIUM/HIGH)

═══════════════════════════════════════════════════════════════════
CLASSIFICAÇÃO DE RISCO (RECOMENDAÇÃO FINAL)
═══════════════════════════════════════════════════════════════════
  - **NONE**: Nenhuma mudança real ou apenas whitespace/comentários
  - **LOW**: Limpeza segura (variáveis não usadas, campos desnecessários validados)
  - **MEDIUM**: Refatoração estrutural sem tocar em lógica crítica (renomeações propagadas)
  - **HIGH**: Alteração de JOINs, WHERE clauses, transformações de negócio, ou sintaxe suspeita

SE DETECTAR ERRO CRÍTICO: Marque "high" + explique em "notes" qual linha/bloco está errado.

═══════════════════════════════════════════════════════════════════
FORMATO DE RESPOSTA JSON (SCHEMA OBRIGATÓRIO)
═══════════════════════════════════════════════════════════════════
Responda APENAS com JSON puro, sem markdown, sem \`\`\`, sem texto extra.

{
  "summary": "Revisão APROVADA/APROVADA COM RESSALVAS/REJEITADA + justificativa em 2-3 frases",
  "changes": [
    {
      "category": "security | performance | readability | structure",
      "area": "Especifique: tabela X linha Y, bloco Z",
      "impact": "EXPLIQUE: problema encontrado ou validação bem-sucedida",
      "risk_level": "none | low | medium | high"
    }
  ],
  "recommended_risk": "none | low | medium | high (máximo entre todos os changes)",
  "notes": "Observações finais: código otimizado está correto? Encontrou sintaxe inválida?"
}

REGRAS DE QUALIDADE:
✓ Campo "changes" deve listar TODOS os pontos de atenção detectados
✓ Campo "impact" deve citar linha/tabela/campo específicos se houver problema
✓ Campo "summary" deve ser decisivo: APROVAR ou REJEITAR com razão clara
✓ Se código idêntico (original === optimized) → recommended_risk = "none"

═══════════════════════════════════════════════════════════════════
SCRIPT ORIGINAL
═══════════════════════════════════════════════════════════════════
${original}

═══════════════════════════════════════════════════════════════════
SCRIPT OTIMIZADO (A SER REVISADO)
═══════════════════════════════════════════════════════════════════
${optimized}
═══════════════════════════════════════════════════════════════════
`.trim();
}

export async function runQlikReviewAgent(
  result: OptimizeResult,
  llmOptions?: LLMOptions
): Promise<OptimizeResult> {
  // Se não houve mudanças, não precisa revisar profundamente, mas vamos passar pelo fluxo.
  const prompt = buildReviewPrompt(result.originalScript, result.optimizedScript);

  try {
    const orchestratorResult = await defaultOrchestrator.executeWithRotation(
      "post_105_breaking_change_analysis",
      prompt,
      60000 // 60s timeout
    );

    if (orchestratorResult.fallbackTriggered || !orchestratorResult.result) {
      logger.warn("Review Agent falhou em todos os provedores.");
      return result;
    }

    const text = orchestratorResult.result;
    const parsed = JSON.parse(text);
    const validated = ReviewSchema.safeParse(parsed);

    if (!validated.success) {
      logger.warn("Review Agent retornou schema inválido", { issues: validated.error.format() });
      return result;
    }

    const reviewData = validated.data;

    const reviewResult: AgentReviewResult = {
      summary: reviewData.summary,
      changes: reviewData.changes.map(c => ({
        category: c.category,
        area: c.area,
        impact: c.impact,
        riskLevel: c.risk_level
      })),
      recommendedRisk: reviewData.recommended_risk,
      notes: reviewData.notes
    };

    // Atualiza o risco se o revisor achar que é maior do que o estimado
    let finalRisk = result.analysis.breakingRisk;
    if (reviewResult.recommendedRisk) {
      const rank: Record<BreakingRisk, number> = { none: 0, low: 1, medium: 2, high: 3 };
      if (rank[reviewResult.recommendedRisk] > rank[finalRisk]) {
        finalRisk = reviewResult.recommendedRisk;
        logger.info(`Review Agent aumentou o risco para ${finalRisk}`);
      }
    }

    return {
      ...result,
      analysis: {
        ...result.analysis,
        breakingRisk: finalRisk
      },
      review: reviewResult
    };

  } catch (err) {
    logger.error("Erro no Review Agent", { error: String(err) });
    return result;
  }
}
