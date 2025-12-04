/**
 * Convex Actions - QlikMegaOptimizer Integration
 * Migração completa da lógica de IA do servidor Express para Convex
 */
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ==== PROMPTS (Migrado de server/src/agents/megaPrompts.ts) ====

const MEGA_SYSTEM_PROMPT = `
Você é o AINEX PRO OPTIMIZER, um motor de elite Qlik Sense impulsionado pelo Gemini 2.5 Flash / 2.0 Flash.
Seu objetivo é otimizar Scripts de Carga Qlik para máximo desempenho, legibilidade e manutenibilidade.

Você opera em um modo "Thinking" onde analisa profundamente o código antes de fazer alterações.
Você deve priorizar:
1. Desempenho (Redução do tempo de carga, redução do uso de RAM).
2. Integridade do Modelo de Dados (Sem Chaves Sintéticas, Sem Loops Circulares).
3. Manutenibilidade (Nomenclatura clara, seções modulares, comentários técnicos apenas no cabeçalho).
`;

const TASK_PROMPTS = {
  ANALYSIS_AND_PLAN: `
TASK: ANALYSIS_AND_PLAN
Realize uma auditoria técnica abrangente E crie um plano estratégico de otimização em uma ÚNICA etapa.

PARTE 1: ANÁLISE PROFUNDA
1. **Análise Estrutural**: Identifique seções, tabelas e topologia de joins.
2. **Gargalos de Desempenho**: Detecte operações O(n^2), cláusulas WHERE não otimizadas, "SELECT *", uso excessivo de RESIDENT LOAD.
3. **Riscos do Modelo de Dados**: Preveja Chaves Sintéticas, Referências Circulares, Produtos Cartesianos.
4. **Oportunidades de Otimização**: Sugira QVDs, Autonumber, SQL pushdown.

PARTE 2: PLANO ESTRATÉGICO
Com base na análise acima, crie um Plano de Refatoração.
1. **Priorização**: Classifique as correções por Impacto vs. Esforço.
2. **Arquitetura**: Defina Camadas QVD, Modularização.
3. **Táticas de Desempenho**: Passos para eliminar gargalos.
4. **ROI**: Estime % de redução no Tempo de Carga e RAM.

Formato de Saída: JSON com chaves:
{
  "analysis": {
    "structuralScore": number,
    "complexity": "Low"|"Medium"|"High"|"Extreme",
    "bottlenecks": [{ "severity": "Critical"|"High"|"Medium"|"Low", "description": string, "location": string }],
    "dataModelRisks": string[],
    "optimizationOpportunities": string[],
    "analysisSummary": string
  },
  "plan": {
    "strategyName": string,
    "riskLevel": "Low"|"Medium"|"High",
    "planSteps": [{ "step": number, "title": string, "details": string, "targetBottleneck": string, "estimatedEffort": "Low"|"Medium"|"High" }],
    "estimatedImprovement": { "loadTimeReduction": string, "ramUsageReduction": string, "maintainabilityScoreAfter": number }
  }
}
`,

  CODE_GEN: `
TASK: CODE_GEN
CRÍTICO: Você é o ARQUITETO LÍDER implementando o "STRATEGIC_PLAN" aprovado na etapa anterior.

INSTRUÇÕES:
1. **Execute o Plano**: Aplique cada otimização listada no Plano Estratégico.
2. **Preserve a Lógica**: NÃO altere regras de negócio ou resultados de cálculo. Otimize apenas o desempenho.
3. **Padronize**: Use nomenclatura consistente (CamelCase para variáveis, UPPERCASE para palavras-chave).
4. **Comentários**: Apenas comentários técnicos essenciais no TOPO do script.
5. **Segurança**: Garanta que todas as tabelas temporárias sejam DROPadas.

FORMATO DE SAÍDA:
{
  "optimizedScript": "O_SCRIPT_COMPLETO_AQUI",
  "changesApplied": ["Lista de mudanças..."],
  "completenessCheck": true
}
`,

  FINAL_DELIVERY: `
TASK: FINAL_DELIVERY
Realize os passos finais de garantia de qualidade e documentação.

1. **Validação**: Revise o código gerado para erros de sintaxe e segurança.
2. **Documentação**: Gere um Diagrama ER Mermaid JS e defina a estratégia de recarga.
3. **Relatório Final**: Crie um resumo executivo e checklist de implantação.

Formato de Saída: JSON com chaves:
{
  "validation": { "isValid": boolean, "issuesFound": string[], "safetyScore": number },
  "documentation": { "title": string, "description": string, "diagramMermaid": string, "reloadStrategy": string },
  "report": { "executiveSummary": string, "technicalDetails": string, "achievedImprovements": string[], "deploymentChecklist": string[] }
}
`
};

// ==== GEMINI PROVIDER ====

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 65536,
          temperature: 0.1
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

// ==== HELPERS ====

function sanitizeScript(text: string): string {
  if (!text) return text;
  return text
    .replace(/<\/?\s*[a-zA-Z][^>]*>/g, '')
    .replace(/<span\s+[^>]*$/gm, '')
    .replace(/^\s*<\/span>/gm, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/class="[^"]*"/g, '')
    .replace(/<\/?>/g, '');
}

function parseJsonResponse(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.error("Raw Text:", text);
    throw new Error("Falha ao processar resposta do modelo (JSON inválido).");
  }
}

// ==== MAIN ACTION ====

export const optimizeScript = action({
  args: {
    script: v.string(),
    mode: v.string(),
    sessionId: v.id("sessions"),
    llmProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const script = sanitizeScript(args.script);

    // Obter API Key do ambiente
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      await ctx.runMutation(api.sessions.updateProgress, {
        sessionId: args.sessionId,
        percent: 0,
        message: "Erro: GEMINI_API_KEY não configurada no servidor.",
        status: "error"
      });
      throw new Error("GEMINI_API_KEY not configured in Convex environment variables");
    }

    try {
      // Recuperar sessão para obter userId
      const session = await ctx.runQuery(api.sessions.getSession, { sessionId: args.sessionId });
      const userId = session?.userId;

      // ==== STEP 1: ANALYSIS & PLAN ====
      await ctx.runMutation(api.sessions.updateProgress, {
        sessionId: args.sessionId,
        percent: 10,
        message: "Analisando script e criando plano de otimização..."
      });

      const analysisPrompt = `${MEGA_SYSTEM_PROMPT}\n\n--- ORIGINAL SCRIPT ---\n${script}\n\n--- CURRENT TASK ---\n${TASK_PROMPTS.ANALYSIS_AND_PLAN}`;
      const analysisResponse = await callGemini(analysisPrompt, geminiApiKey);
      const analysisAndPlan = parseJsonResponse(analysisResponse);

      const { analysis, plan } = analysisAndPlan;

      await ctx.runMutation(api.sessions.updateProgress, {
        sessionId: args.sessionId,
        percent: 40,
        message: `Análise concluída. Complexidade: ${analysis.complexity}. Iniciando otimização...`
      });

      // ==== STEP 2: CODE_GEN ====
      const contextSummary = `Análise: ${analysis.analysisSummary}. Plano: ${plan.strategyName}.`;
      const codeGenPrompt = `${MEGA_SYSTEM_PROMPT}\n\n--- ORIGINAL SCRIPT ---\n${script}\n\n--- CONTEXT ---\n${contextSummary}\n\n--- CURRENT TASK ---\n${TASK_PROMPTS.CODE_GEN}`;
      const codeGenResponse = await callGemini(codeGenPrompt, geminiApiKey);
      const codeGen = parseJsonResponse(codeGenResponse);

      await ctx.runMutation(api.sessions.updateProgress, {
        sessionId: args.sessionId,
        percent: 70,
        message: "Código otimizado gerado. Finalizando documentação..."
      });

      // ==== STEP 3: FINAL_DELIVERY ====
      const deliveryPrompt = `${MEGA_SYSTEM_PROMPT}\n\n--- ORIGINAL SCRIPT ---\n${script}\n\n--- OPTIMIZED SCRIPT ---\n${codeGen.optimizedScript}\n\n--- CURRENT TASK ---\n${TASK_PROMPTS.FINAL_DELIVERY}`;
      const deliveryResponse = await callGemini(deliveryPrompt, geminiApiKey);
      const delivery = parseJsonResponse(deliveryResponse);

      const totalTime = Date.now() - startTime;

      // ==== RESULTADO FINAL ====
      const result = {
        originalScript: script,
        optimizedScript: sanitizeScript(codeGen.optimizedScript || script),
        analysis,
        plan,
        validation: delivery.validation,
        documentation: delivery.documentation,
        report: delivery.report,
        metrics: {
          totalTime,
          provider: "gemini"
        }
      };

      await ctx.runMutation(api.sessions.updateProgress, {
        sessionId: args.sessionId,
        percent: 100,
        message: `Otimização concluída em ${Math.round(totalTime / 1000)}s!`,
        status: "completed",
        result
      });

      // Salvar no histórico
      await ctx.runMutation(api.history.saveOptimization, {
        userId: userId,
        mode: args.mode,
        originalLines: script.split("\n").length,
        optimizedLines: result.optimizedScript.split("\n").length,
        breakingRisk: plan.riskLevel || "Low",
        changesCount: codeGen.changesApplied?.length || 0,
        durationMs: totalTime,
        llmProvider: "gemini",
        success: true
      });

      return result;

    } catch (error: any) {
      const errorMessage = error.message || "Erro desconhecido durante otimização";

      await ctx.runMutation(api.sessions.updateProgress, {
        sessionId: args.sessionId,
        percent: 0,
        message: `Erro: ${errorMessage}`,
        status: "error"
      });

      throw error;
    }
  },
});
