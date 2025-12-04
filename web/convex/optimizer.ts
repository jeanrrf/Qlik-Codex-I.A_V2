/**
 * Convex Actions - QlikMegaOptimizer Integration
 * Migração completa da lógica de IA do servidor Express para Convex
 */
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { generateCompactAuditReport } from "./consultancy";
import { Buffer } from "buffer";

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

const JSON_RESPONSE_INSTRUCTIONS = `
IMPORTANTE: Responda exclusivamente com o JSON descrito acima. Garanta que todas as strings estejam entre aspas duplas fechadas, não inclua texto adicional antes ou depois do objeto e finalize a resposta no caractere "}" final. Se o JSON for longo, conclua o envio apenas quando o objeto estiver completo.
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
${JSON_RESPONSE_INSTRUCTIONS}
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
  "optimizedScriptBase64": "BASE64_ENCODED_SCRIPT_SEM_QUEBRAS",
  "changesApplied": ["Lista de mudanças..."],
        "completenessCheck": true
}
IMPORTANTE: Codifique o script otimizado em Base64 e forneça-o em "optimizedScriptBase64". Evite quebras de linha dentro do valor Base64 e não envie texto adicional fora do objeto JSON para garantir integridade do payload.
${JSON_RESPONSE_INSTRUCTIONS}
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
${JSON_RESPONSE_INSTRUCTIONS}
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

function decodeBase64(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return Buffer.from(value, "base64").toString("utf-8");
  } catch (error) {
    console.error("Base64 decode failed:", error);
    return undefined;
  }
}

function extractBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
  }
  return null;
}

function parseJsonResponse(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.error("Raw Text:", text);
    const repaired = extractBalancedJson(text);
    if (repaired) {
      try {
        console.warn("JSON repair applied. Attempting parsed candidate.");
        return JSON.parse(repaired);
      } catch (repairErr) {
        console.error("JSON Repair Failed:", repairErr);
      }
    }
    const bracketStart = text.indexOf("{");
    const bracketEnd = text.lastIndexOf("}");
    if (bracketStart !== -1 && bracketEnd > bracketStart) {
      const fallback = text.slice(bracketStart, bracketEnd + 1);
      try {
        console.warn("JSON fallback slice applied.");
        return JSON.parse(fallback);
      } catch (fallbackErr) {
        console.error("JSON Fallback Failed:", fallbackErr);
      }
    }
    throw new Error("Falha ao processar resposta do modelo (JSON inválido).");
  }
}

type StageStatus = "pending" | "running" | "success" | "error" | "skipped" | "timeout";
type SubStepStatus = "pending" | "running" | "success" | "error" | "timeout";

interface ProgressSubStep {
  id: string;
  name: string;
  description?: string;
  status: SubStepStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
  currentRunningTime?: number;
}

interface ProgressStage {
  id: string;
  name: string;
  status: StageStatus;
  startTime?: string;
  endTime?: string;
  duration?: number;
  visible?: boolean;
  subSteps?: ProgressSubStep[];
}

const ULTRA_EXPERT_STAGE_TEMPLATE: Omit<ProgressStage, "status" | "startTime" | "endTime" | "duration" | "subSteps"> & { subSteps?: Array<Omit<ProgressSubStep, "status">> }[] = [
  {
    id: "ANALYSIS_AND_PLAN",
    name: "Analysis & Strategy (Fusion)",
    visible: true,
    subSteps: [
      { id: "DEEP_ANALYSIS", name: "Deep Analysis" },
      { id: "STRATEGIC_PLAN", name: "Strategic Planning" }
    ]
  },
  {
    id: "CODE_GEN",
    name: "Code Generation",
    visible: true,
    subSteps: [
      { id: "CODE_GEN", name: "Generating Optimized Qlik Script" }
    ]
  },
  {
    id: "FINAL_DELIVERY",
    name: "Final Delivery & Report",
    visible: true,
    subSteps: [
      { id: "FINAL_DELIVERY", name: "Validating, Documenting & Reporting" }
    ]
  }
];

function createInitialStages(): ProgressStage[] {
  return ULTRA_EXPERT_STAGE_TEMPLATE.map(stage => ({
    id: stage.id,
    name: stage.name,
    visible: stage.visible,
    status: "pending",
    subSteps: stage.subSteps?.map(sub => ({
      ...sub,
      status: "pending" as SubStepStatus
    }))
  }));
}

function calculateStageStatus(subSteps: ProgressSubStep[]): StageStatus {
  const allCompleted = subSteps.every(s => s.status === "success");
  const hasError = subSteps.some(s => s.status === "error");
  const hasRunning = subSteps.some(s => s.status === "running");

  if (hasError) return "error";
  if (allCompleted) return "success";
  if (hasRunning) return "running";
  return "pending";
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

    let stageStates = createInitialStages();
    const subStepStartTimes = new Map<string, number>();

    const getStageSnapshot = (): ProgressStage[] => {
      const now = Date.now();
      return stageStates.map(stage => ({
        ...stage,
        subSteps: stage.subSteps?.map(sub => {
          if (sub.status === "running" && subStepStartTimes.has(sub.id)) {
            return { ...sub, currentRunningTime: now - subStepStartTimes.get(sub.id)! };
          }
          return sub;
        })
      }));
    };

    const setSubStepStatus = (stageId: string, subStepId: string, status: SubStepStatus, errorMessage?: string) => {
      const now = Date.now();
      stageStates = stageStates.map(stage => {
        if (stage.id !== stageId) return stage;
        const updatedSubSteps = stage.subSteps?.map(sub => {
          if (sub.id !== subStepId) return sub;
          const next: ProgressSubStep = { ...sub, status };
          if (status === "running") {
            subStepStartTimes.set(subStepId, now);
            next.startTime = new Date(now).toISOString();
            delete next.endTime;
            delete next.duration;
            delete next.error;
          } else {
            const start = subStepStartTimes.get(subStepId) ?? now;
            const duration = now - start;
            next.duration = duration;
            next.endTime = new Date(now).toISOString();
            subStepStartTimes.delete(subStepId);
            if (status === "error") {
              next.error = errorMessage;
            }
          }
          return next;
        }) || [];
        const stageStatus = updatedSubSteps.length ? calculateStageStatus(updatedSubSteps) : stage.status;
        const updatedStage: ProgressStage = {
          ...stage,
          subSteps: updatedSubSteps,
          status: stageStatus,
          duration: updatedSubSteps.reduce((sum, step) => sum + (step.duration || 0), 0)
        };
        if (stageStatus === "running" && !updatedStage.startTime) {
          updatedStage.startTime = new Date(now).toISOString();
          updatedStage.endTime = undefined;
        }
        if ((stageStatus === "success" || stageStatus === "error" || stageStatus === "timeout") && updatedStage.startTime) {
          updatedStage.endTime = new Date(now).toISOString();
        }
        return updatedStage;
      });
    };

    const markAllStagesAsFailed = (errorMessage: string) => {
      const now = Date.now();
      stageStates = stageStates.map(stage => {
        const updatedSubSteps = stage.subSteps?.map(sub => {
          if (sub.status === "success") return sub;
          const start = subStepStartTimes.get(sub.id) ?? now;
          const duration = sub.duration ?? now - start;
          subStepStartTimes.delete(sub.id);
          return {
            ...sub,
            status: "error",
            duration,
            endTime: new Date(now).toISOString(),
            error: sub.error || errorMessage
          };
        }) || [];
        return {
          ...stage,
          status: stage.status === "success" ? "success" : "error",
          subSteps: updatedSubSteps,
          duration: updatedSubSteps.reduce((sum, step) => sum + (step.duration || 0), 0),
          endTime: stage.status === "success" ? stage.endTime : new Date(now).toISOString()
        };
      });
    };

    const sendProgressUpdate = async (
      percent: number,
      message: string,
      status: "running" | "completed" | "error" = "running",
      resultPayload?: any
    ) => {
      const payload: any = {
        sessionId: args.sessionId,
        percent,
        message,
        status,
        stages: getStageSnapshot()
      };
      if (resultPayload) {
        payload.result = resultPayload;
      }
      await ctx.runMutation(api.sessions.updateProgress, payload);
    };

    try {
      const session = await ctx.runQuery(api.sessions.getSession, { sessionId: args.sessionId });
      const userId = session?.userId;
      setSubStepStatus("ANALYSIS_AND_PLAN", "DEEP_ANALYSIS", "running");
      await sendProgressUpdate(5, "Analisando script e criando plano de otimização...");

      const analysisPrompt = `${MEGA_SYSTEM_PROMPT}\n\n--- ORIGINAL SCRIPT ---\n${script}\n\n--- CURRENT TASK ---\n${TASK_PROMPTS.ANALYSIS_AND_PLAN}`;
      const analysisResponse = await callGemini(analysisPrompt, geminiApiKey);
      const analysisAndPlan = parseJsonResponse(analysisResponse);

      const { analysis, plan } = analysisAndPlan;

      setSubStepStatus("ANALYSIS_AND_PLAN", "DEEP_ANALYSIS", "success");
      setSubStepStatus("ANALYSIS_AND_PLAN", "STRATEGIC_PLAN", "running");
      await sendProgressUpdate(30, "Plano estratégico em execução...");
      setSubStepStatus("ANALYSIS_AND_PLAN", "STRATEGIC_PLAN", "success");

      const contextSummary = `Análise: ${analysis.analysisSummary}. Plano: ${plan.strategyName}.`;
      const codeGenPrompt = `${MEGA_SYSTEM_PROMPT}\n\n--- ORIGINAL SCRIPT ---\n${script}\n\n--- CONTEXT ---\n${contextSummary}\n\n--- CURRENT TASK ---\n${TASK_PROMPTS.CODE_GEN}`;

      setSubStepStatus("CODE_GEN", "CODE_GEN", "running");
      await sendProgressUpdate(50, "Gerando código otimizado...");
      const codeGenResponse = await callGemini(codeGenPrompt, geminiApiKey);
      const codeGen = parseJsonResponse(codeGenResponse);
      const decodedOptimizedScript = decodeBase64(codeGen.optimizedScriptBase64) || codeGen.optimizedScript || "";
      const optimizedScript = sanitizeScript(decodedOptimizedScript || script);
      setSubStepStatus("CODE_GEN", "CODE_GEN", "success");
      await sendProgressUpdate(65, "Código otimizado gerado. Validando entrega...");

      const deliveryPrompt = `${MEGA_SYSTEM_PROMPT}\n\n--- ORIGINAL SCRIPT ---\n${script}\n\n--- OPTIMIZED SCRIPT ---\n${optimizedScript}\n\n--- CURRENT TASK ---\n${TASK_PROMPTS.FINAL_DELIVERY}`;

      setSubStepStatus("FINAL_DELIVERY", "FINAL_DELIVERY", "running");
      await sendProgressUpdate(80, "Documentando e reportando os resultados...");
      const deliveryResponse = await callGemini(deliveryPrompt, geminiApiKey);
      const delivery = parseJsonResponse(deliveryResponse);
      setSubStepStatus("FINAL_DELIVERY", "FINAL_DELIVERY", "success");
      await sendProgressUpdate(90, "Preparando resultado final...");

      const totalTime = Date.now() - startTime;

      const consultancyReport = generateCompactAuditReport(
        script,
        optimizedScript,
        plan.riskLevel || "Low"
      );

      const result = {
        originalScript: script,
        optimizedScript,
        analysis,
        plan,
        validation: delivery.validation,
        documentation: delivery.documentation,
        report: delivery.report,
        consultancyReport,
        // Map validation to review format expected by frontend
        review: {
          summary: delivery.validation.isValid ? "Aprovado com sucesso" : "Aprovado com ressalvas",
          changes: codeGen.changesApplied?.map((c: string) => ({
            category: "structure",
            area: "Script",
            impact: c,
            riskLevel: "low"
          })) || [],
          recommended_risk: plan.riskLevel || "low",
          notes: delivery.validation.issuesFound?.join("\n") || "Nenhum problema crítico encontrado."
        },
        // Map report to explanation format expected by frontend
        explanation: delivery.report.technicalDetails,
        metrics: {
          totalTime,
          provider: "gemini"
        }
      };

      await sendProgressUpdate(
        100,
        `Otimização concluída em ${Math.round(totalTime / 1000)}s!`,
        "completed",
        result
      );

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
      markAllStagesAsFailed(errorMessage);
      await sendProgressUpdate(0, `Erro: ${errorMessage}`, "error");
      throw error;
    }
  },
});
