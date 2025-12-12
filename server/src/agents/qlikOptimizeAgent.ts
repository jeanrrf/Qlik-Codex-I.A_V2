import { createHash } from "crypto";

import { z, ZodSchema } from "zod";

import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { compactScriptForPrompt } from "../lib/promptCompactor";
import { ProviderOrchestrator, createOrchestrator } from "../lib/providerOrchestrator";
import { parseQlikScript, buildParserSummary } from "../lib/qlikParser";
import { sseEmitter } from "../lib/sseEmitter";
import { extractJsonFromText } from "../lib/structuredResponse";
import type { OptimizationStepId } from "../types/optimization";

import { QlikGranularOptimizer } from "./qlikGranularOptimizer";

// --- SCHEMAS (Merged from megaOptimizerSchemas.ts) ---

export const DeepAnalysisSchema = z.object({
  structuralScore: z.number().min(0).max(100).describe("Score de 0 a 100 da estrutura do script"),
  complexity: z.enum(["Low", "Medium", "High", "Extreme"]).describe("Nível de complexidade geral"),
  bottlenecks: z.array(z.object({
    severity: z.enum(["Critical", "High", "Medium", "Low"]),
    description: z.string(),
    location: z.string().optional()
  })).describe("Lista de gargalos de performance identificados"),
  dataModelRisks: z.array(z.string()).describe("Riscos ao modelo de dados (chaves sintéticas, loops, etc)"),
  optimizationOpportunities: z.array(z.string()).describe("Oportunidades de otimização (QVDs, Autonumber, etc)"),
  analysisSummary: z.string().describe("Resumo executivo da análise técnica")
});

export const StrategicPlanSchema = z.object({
  strategyName: z.string().describe("Nome da estratégia de otimização adotada"),
  riskLevel: z.enum(["Low", "Medium", "High"]).describe("Risco geral da aplicação do plano"),
  planSteps: z.array(z.object({
    step: z.number(),
    title: z.string(),
    details: z.string(),
    targetBottleneck: z.string().optional().describe("Qual gargalo identificado isso resolve"),
    estimatedEffort: z.enum(["Low", "Medium", "High"])
  })).describe("Passos sequenciais do plano de refatoração"),
  estimatedImprovement: z.object({
    loadTimeReduction: z.string().describe("Estimativa de redução de tempo de carga (ex: '30%')"),
    ramUsageReduction: z.string().describe("Estimativa de redução de RAM (ex: '20%')"),
    maintainabilityScoreAfter: z.number().min(0).max(100).describe("Score de manutenibilidade projetado")
  })
});

export const AnalysisAndPlanSchema = z.object({
  analysis: DeepAnalysisSchema,
  plan: StrategicPlanSchema
});

export const CodeGenSchema = z.object({
  optimizedScript: z.string().describe("The full, executable Qlik Load Script with optimizations applied"),
  changesApplied: z.array(z.object({
    category: z.enum(["performance", "readability", "cleanup", "structure", "model_integrity", "maintainability", "security", "logic"]).describe("Category of the change"),
    area: z.string().describe("Description of what was changed"),
    impact: z.string().describe("Impact of the change (e.g., 'High performance gain')"),
    riskLevel: z.enum(["none", "low", "medium", "high"]).describe("Risk level of this change")
  })).describe("List of specific changes made to the script"),
  completenessCheck: z.boolean().describe("True if the script is complete and not truncated")
});

export const FinalDeliverySchema = z.object({
  validation: z.object({
    isValid: z.boolean(),
    issuesFound: z.array(z.string()).max(4).describe("Max 4 critical issues"),
    safetyScore: z.number()
  }),
  documentation: z.object({
    title: z.string(),
    diagramMermaid: z.string().describe("Concise Mermaid ER diagram")
  }),
  report: z.object({
    executiveSummary: z.string().max(600).describe("Max 600 chars"),
    achievedImprovements: z.array(z.string()).max(4).describe("Top 4 improvements"),
    deploymentChecklist: z.array(z.string()).max(4).describe("Top 4 deploy steps")
  })
});

// --- PROMPT PLAN (Merged from promptPlan.ts) ---

export type MegaTaskId = "ANALYSIS_AND_PLAN" | "CODE_GEN" | "FINAL_DELIVERY";

const PERSONA = `Você é o AINEX PRO OPTIMIZER (Qlik Sense), sênior.
Objetivo: otimizar script de carga com alta performance e integridade, em PT-BR, preservando a lógica de negócio.`;

const NEGATIVE_RULES = [
  "Proibido DDL/DML SQL (CREATE/ALTER/INSERT/UPDATE/DELETE).",
  "Não use JOIN dentro de FROM (SQL); use JOIN prefixado em LOAD.",
  "Saída sempre texto puro JSON (sem Markdown/HTML).",
  "Não invente funções não-Qlik (DATEDIFF, GETDATE, CASE WHEN etc.).",
  "Sem Set Analysis '{<...>}' no script de carga.",
  "Preserve nomes de tabelas/chaves; não drope campos-chave.",
  "Evite SELECT */LOAD * — use campos explícitos.",
  "Dê DROP em temporárias usadas em RESIDENT/intermediárias."
];

const TASK_TEMPLATES: Record<MegaTaskId, string> = {
  ANALYSIS_AND_PLAN: `TAREFA: ANÁLISE + PLANO (uma única resposta JSON)
- Audite estrutura (tabelas, joins, riscos: chave sintética, referência circular, cartesiano, LOAD *).
- Ache gargalos de performance (JOIN sem chave, RESIDENT em cascata, WHERE ausente).
- Crie plano priorizado (Impacto vs Esforço) com 5-8 passos máximos.
Limites de saída: máximo 6 bottlenecks, máximo 6 oportunidades, texto total <= 2800 caracteres.
Formato JSON (sem markdown, sem comentários):
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
}`,
  CODE_GEN: `TAREFA: CODE GEN (aplicar plano, preservar lógica)
- Otimize sem mudar regras de negócio.
- Use nomenclatura consistente; alinhar AS; remover SELECT/LOAD *; garantir DROP de temporárias.
- Limites de saída: changesApplied no máximo 8 itens; resposta total <= 2800 caracteres; sem markdown/HTML.
- Saída deve ser JSON (texto puro, sem markdown):
{
  "optimizedScript": "SCRIPT_OTIMIZADO_EM_TEXTO_PURO",
  "changesApplied": [
    {
      "category": "performance" | "readability" | "cleanup" | "structure" | "model_integrity" | "maintainability" | "security" | "logic",
      "area": "Descrição concisa da área otimizada (ex: joins, RESIDENT, QVD)",
      "impact": "Impacto da mudança (ex: redução de tempo de carga)",
      "riskLevel": "low"
    }
  ],
  "completenessCheck": true
}`,
  FINAL_DELIVERY: `TAREFA: VALIDAÇÃO + DOC FINAL (JSON conciso)
- Validar sintaxe (DDL/DML proibido).
- Doc ER (Mermaid), checklist deploy.
- Limites: máx 4 issues, 4 checklist items; total <= 1200 chars.
JSON:
{
  "validation": { "isValid": bool, "issuesFound": string[], "safetyScore": number },
  "documentation": { "title": string, "diagramMermaid": string },
  "report": { "executiveSummary": string, "achievedImprovements": string[], "deploymentChecklist": string[] }
}
`
};

function buildNegativeSection(): string {
  return NEGATIVE_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");
}

function buildMegaPrompt(task: MegaTaskId, script: string, parserSummary: string, history?: string): string {
  const taskTemplate = TASK_TEMPLATES[task];
  const historyBlock = history ? `\n--- HISTÓRICO (Resumo) ---\n${history}\n` : "";

  return `
${PERSONA}

--- GUARDRAILS (NÃO VIOLAR) ---
${buildNegativeSection()}

--- CONTEXTO ESTRUTURADO ---
Parser: ${parserSummary}
${historyBlock}
--- SCRIPT ORIGINAL (compactado para economia de tokens) ---
${script}

--- INSTRUÇÕES DA TAREFA ---
${taskTemplate}

--- FORMATO OBRIGATÓRIO ---
- Responder somente o JSON especificado, texto puro, sem markdown/HTML nem fences.
- Limitar listas a no máximo 8 itens e resposta total a ~2800 caracteres.
- Se nenhuma mudança for necessária, devolver campos coerentes indicando ausência de alterações.
- Manter quebras de linha e indentação do script dentro do campo optimizedScript quando aplicável.
`;
}

// --- AGENT LOGIC ---

// Performance constants
const MAX_HISTORY_TOKENS = 300; // Limite de chars para resumo do histórico (encurta prompt)
const ANALYSIS_CACHE = new Map<string, { result: Record<string, unknown>; timestamp: number }>();
const ANALYSIS_CACHE_TTL = 1800000; // 30 minutos
const ANALYSIS_CACHE_MAX_SIZE = 50;

// Task timeout configuration (in ms) - DYNAMIC based on script size
// Formula: baseTimeout + (lineCount * lineMultiplier)
// For 1146 lines: 180s + (1146 * 0.15) ≈ 352s (~6 min) for CODE_GEN
const TIMEOUT_CONFIG = {
  ANALYSIS_AND_PLAN: { base: 120000, perLine: 100, min: 90000, max: 480000 },   // 2-8 min
  CODE_GEN: { base: 180000, perLine: 150, min: 120000, max: 600000 },          // 3-10 min  
  FINAL_DELIVERY: { base: 60000, perLine: 50, min: 45000, max: 180000 }        // 1-3 min
};

function calculateDynamicTimeout(task: MegaTaskId, scriptLineCount: number): number {
  const config = TIMEOUT_CONFIG[task];
  if (!config) return 120000; // fallback 2 min
  const computed = config.base + (scriptLineCount * config.perLine);
  return Math.max(config.min, Math.min(config.max, computed));
}
const MAX_TASK_RETRIES = 3;
const RETRYABLE_TASK_ERROR_PATTERNS = [
  /timeout/i,
  /json/i,
  /schema/i,
  /stream/i,
  /provider/i,
  /failed/i,
  /falh/i
];

function isRetryableTaskError(message: string | undefined): boolean {
  if (!message) return false;
  if (/abort/i.test(message)) return false;
  return RETRYABLE_TASK_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

interface MegaOptimizerResult {
  originalScript: string;
  optimizedScript: string;
  analysis: Record<string, unknown>;
  changes?: Array<Record<string, unknown>>; // Added for frontend compatibility
  plan: Record<string, unknown>;
  validation: Record<string, unknown>;
  documentation: Record<string, unknown>;
  report: Record<string, unknown>;
  metrics: {
    totalTime: number;
    taskTimes: Record<string, number>;
    providerStats?: Record<string, { success: number; failed: number }>;
  };
}

interface MegaOptimizerOptions {
  signal?: AbortSignal;
}

export class QlikOptimizeAgent {
  private script: string;
  private promptScript: string;
  private scriptHash: string;
  private compactHistory: string = ""; // Resumo compacto em vez de histórico completo
  private taskTimes: Record<string, number> = {};
  private orchestrator: ProviderOrchestrator;
  private abortSignal?: AbortSignal;
  private parserSummary: string;

  constructor(script: string, options?: MegaOptimizerOptions) {
    // Sanitize input script to remove any HTML tags if the user pasted formatted code
    // Uses a smart regex to preserve "WHERE Value < 10" but remove "<span...>"
    this.script = QlikOptimizeAgent.sanitizeScript(script);
    const compaction = compactScriptForPrompt(this.script);
    this.promptScript = compaction.compacted;
    this.scriptHash = createHash('sha256').update(this.script).digest('hex').substring(0, 16);
    this.abortSignal = options?.signal;
    const parsed = parseQlikScript(this.script);
    this.parserSummary = buildParserSummary(parsed);

    logger.info("[MegaOptimizer] Script compactado para prompt", compaction.stats);

    // Cria orquestrador com configuração otimizada para MegaOptimizer + Kimi K2
    this.orchestrator = createOrchestrator({
      maxAttemptsPerStep: 3,
      providerOrder: ["google", "nvidia"],  // Gemini primeiro, NVIDIA fallback
      neverRetryProvider: true,
      timeoutPerStep: 120000,  // 2 min default por step
      globalTimeout: 420000   // 7 min total (scripts grandes)
    });
  }

  /**
   * Gera resumo compacto de um resultado de task para histórico
   * OTIMIZAÇÃO: Evita acumulação exponencial de tokens
   */
  private summarizeTaskResult(taskName: string, result: unknown): string {
    const maxLen = MAX_HISTORY_TOKENS;
    let summary = `[${taskName}]: `;

    if (taskName === "ANALYSIS_AND_PLAN") {
      // Extrai apenas pontos críticos da análise
      let criticalIssues: unknown[] = [];
      let planObj = undefined as { steps?: unknown[] } | undefined;
      if (typeof result === 'object' && result !== null) {
        const r = result as Record<string, unknown>;
        if (r.analysis && typeof r.analysis === 'object') {
          const analysis = r.analysis as Record<string, unknown>;
          if (Array.isArray(analysis.issues)) {
            criticalIssues = (analysis.issues as unknown[]).slice(0, 3);
          }
        }
        planObj = r.plan as { steps?: unknown[] } | undefined;
      }
      const topPriorities = Array.isArray(planObj?.steps)
        ? (planObj.steps as unknown[]).slice(0, 3).map((s) => {
          if (typeof s === 'object' && s !== null && 'action' in (s as Record<string, unknown>)) {
            return String((s as Record<string, unknown>).action);
          }
          return String(s);
        })
        : [];
      summary += `Issues: ${criticalIssues.join(', ').substring(0, 150)}. Priorities: ${topPriorities.join(', ').substring(0, 150)}`;
    } else if (taskName === "CODE_GEN") {
      // Apenas confirma que script foi gerado, não inclui o script
      let lineCount = 0;
      if (typeof result === 'object' && result !== null && 'optimizedScript' in (result as Record<string, unknown>)) {
        const rs = (result as Record<string, unknown>).optimizedScript;
        if (typeof rs === 'string') lineCount = rs.split('\n').length;
      }
      summary += `Script gerado (${lineCount} linhas). Mudanças aplicadas com sucesso.`;
    } else {
      summary += "Concluído.";
    }

    return summary.substring(0, maxLen);
  }

  /**
   * Verifica cache de análise por hash do script
   */
  private getCachedAnalysis(): Record<string, unknown> | null {
    const cached = ANALYSIS_CACHE.get(this.scriptHash);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > ANALYSIS_CACHE_TTL) {
      ANALYSIS_CACHE.delete(this.scriptHash);
      return null;
    }

    logger.info(`[MegaOptimizer] CACHE HIT para análise`, { hash: this.scriptHash, age: `${Math.round(age / 1000)}s` });
    return cached.result;
  }

  /**
   * Armazena análise no cache
   */
  private setCachedAnalysis(result: Record<string, unknown>): void {
    // Limpa cache se muito grande
    if (ANALYSIS_CACHE.size >= ANALYSIS_CACHE_MAX_SIZE) {
      const oldestKey = Array.from(ANALYSIS_CACHE.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0]?.[0];
      if (oldestKey) ANALYSIS_CACHE.delete(oldestKey);
    }

    ANALYSIS_CACHE.set(this.scriptHash, { result, timestamp: Date.now() });
    logger.info(`[MegaOptimizer] Análise cacheada`, { hash: this.scriptHash });
  }

  /**
   * Removes HTML tags and entities from script text.
   * Preserves valid Qlik operators like < > in expressions.
   */
  private static sanitizeScript(text: string): string {
    if (!text) return text;
    return text
      .replace(/<\/?\s*[a-zA-Z][^>]*>/g, '')  // Remove HTML tags like <span>, </div>
      .replace(/<span\s+[^>]*$/gm, '')        // Remove incomplete opening tags
      .replace(/^\s*<\/span>/gm, '')          // Remove orphan closing tags
      .replace(/&lt;/g, '<')                  // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/class="[^"]*"/g, '')          // Remove orphan class attributes
      .replace(/<\/?>/g, '');                 // Remove empty tags
  }

  private async executeTask(taskName: MegaTaskId, schema?: ZodSchema): Promise<Record<string, unknown>> {
    const totalStart = Date.now();
    const scriptForPrompt = taskName === "FINAL_DELIVERY"
      ? "Contexto do script já fornecido nas etapas anteriores. Use apenas os artefatos gerados (optimizedScript, plan, validation)."
      : this.promptScript;

    let fullPrompt = buildMegaPrompt(taskName, scriptForPrompt, this.parserSummary, this.compactHistory);

    // Token budgeting: if prompt estimated tokens exceeds config limit, trim compactHistory progressively
    const maxTokens = config.maxPromptTokens || 50000;
    let estimatedTokens = Math.ceil(fullPrompt.length / 4);
    if (estimatedTokens > maxTokens) {
      logger.warn(`[MegaOptimizer] Prompt exceeds token budget (${estimatedTokens} tokens > ${maxTokens}). Trimming history...`, { taskName, estimatedTokens });

      sseEmitter.sendToCurrent({ type: "warning", message: `Prompt trimmed due to token budget (${estimatedTokens} tokens > ${maxTokens})` });

      // Try progressive trimming: remove earliest summaries from compactHistory until under budget
      const parts = this.compactHistory.split('\n').filter(Boolean);
      while (parts.length > 0) {
        parts.shift(); // remove oldest
        this.compactHistory = parts.join('\n');
        fullPrompt = buildMegaPrompt(taskName, scriptForPrompt, this.parserSummary, this.compactHistory);
        estimatedTokens = Math.ceil(fullPrompt.length / 4);
        if (estimatedTokens <= maxTokens) break;
      }

      if (estimatedTokens > maxTokens) {
        // As a last resort, clear compactHistory entirely
        this.compactHistory = '';
        fullPrompt = buildMegaPrompt(taskName, scriptForPrompt, this.parserSummary, this.compactHistory);
        estimatedTokens = Math.ceil(fullPrompt.length / 4);
      }

      logger.info(`[MegaOptimizer] Prompt size after trimming: ${estimatedTokens} tokens`, { taskName });
    }

    // DYNAMIC TIMEOUT based on script size
    const scriptLineCount = this.script.split(/\r?\n/).length;
    const timeout = calculateDynamicTimeout(taskName, scriptLineCount);
    logger.info(`[MegaOptimizer] Dynamic timeout for ${taskName}: ${timeout}ms (${scriptLineCount} lines)`, { scriptLineCount, timeout });

    const stepId = `mega_${taskName.toLowerCase()}` as OptimizationStepId;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_TASK_RETRIES; attempt++) {
      if (this.abortSignal?.aborted) {
        throw new Error(`Task ${taskName} abortada pelo usuário`);
      }

      logger.info(`[MegaOptimizer] Starting task: ${taskName} (attempt ${attempt}/${MAX_TASK_RETRIES})`);

      const statusLabel = attempt > 1
        ? `Regenerando ${taskName} (tentativa ${attempt}/${MAX_TASK_RETRIES})`
        : `Executando ${taskName}...`;

      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: `${taskName.toLowerCase()}_attempt_${attempt}` as OptimizationStepId,
          name: statusLabel,
          description: attempt > 1
            ? `Retry automático ${attempt}/${MAX_TASK_RETRIES}`
            : `Primeira tentativa de ${taskName}`,
          status: "running",
          startTime: new Date().toISOString()
        }
      });

      try {
        logger.info(`[MegaOptimizer] >>> SENDING [${taskName}] via Orchestrator`, {
          contextSizeChars: fullPrompt.length,
          scriptSizeChars: scriptForPrompt.length,
          timeout: `${timeout}ms`,
          sentAt: new Date().toISOString(),
          attempt
        });

        const orchestratorResult = await this.orchestrator.executeWithRotation(
          stepId,
          fullPrompt,
          timeout,
          this.abortSignal
        );

        if (this.abortSignal?.aborted) {
          throw new Error(`Task ${taskName} abortada após retorno do LLM`);
        }

        if (orchestratorResult.fallbackTriggered || !orchestratorResult.result) {
          const errorMessage = orchestratorResult.fallbackReason || "Todas as tentativas falharam";
          throw new Error(`Task ${taskName} failed: ${errorMessage}`);
        }

        const responseText = orchestratorResult.result;
        const successfulProvider = orchestratorResult.attempts.find(a => a.success);

        // CAPTURE METADATA (tokens, thinking)
        const metadata = successfulProvider?.metadata;
        const tokensConsumed = metadata?.tokensConsumed as { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;
        const thinkingContent = metadata?.thinkingContent as string | undefined;

        logger.info(`[MegaOptimizer] <<< RECEIVED [${taskName}] via Orchestrator`, {
          responseSizeChars: responseText.length,
          provider: successfulProvider?.provider || 'unknown',
          model: successfulProvider?.model || 'unknown',
          attempts: orchestratorResult.attempts.length,
          tokensConsumed,
          hasThinking: Boolean(thinkingContent),
          receivedAt: new Date().toISOString(),
          attempt
        });

        // EMIT TOKEN USAGE via SSE
        if (tokensConsumed) {
          sseEmitter.sendToCurrent({
            type: "token_usage",
            taskName,
            provider: successfulProvider?.provider || 'unknown',
            model: successfulProvider?.model || 'unknown',
            tokensConsumed
          });
        }

        // EMIT THINKING CONTENT via SSE (if Gemini 2.5 Flash Thinking Mode is enabled)
        if (thinkingContent) {
          sseEmitter.sendToCurrent({
            type: "thinking",
            taskName,
            thinkingContent
          });
        }

        let parsedResult: Record<string, unknown> = {};
        try {
          // Use robust extractor util
          let raw: unknown = undefined;
          try {
            raw = extractJsonFromText(responseText);
          } catch (modErr) {
            logger.warn('[MegaOptimizer] structuredResponse extraction failed, falling back to conservative JSON parse', { error: modErr });
            try {
              raw = JSON.parse(responseText);
            } catch (_simpleErr) {
              // As a last fallback, attempt to extract substring between first { and last }
              const first = responseText.indexOf('{');
              const last = responseText.lastIndexOf('}');
              if (first >= 0 && last > first) {
                try {
                  raw = JSON.parse(responseText.substring(first, last + 1));
                } catch (subErr) {
                  logger.warn('[MegaOptimizer] Fallback JSON extraction also failed', { error: subErr });
                }
              }
            }
          }
          if (typeof raw === 'object' && raw !== null) {
            parsedResult = raw as Record<string, unknown>;
          } else {
            parsedResult = { optimizedScript: String(raw) };
          }

          // Normalize escaped newlines if present
          const opt = parsedResult.optimizedScript;
          if (typeof opt === 'string' && opt.includes('\\n') && !opt.includes('\n')) {
            parsedResult.optimizedScript = opt.replace(/\\n/g, '\n');
          }
        } catch (e) {
          logger.warn(`[MegaOptimizer] Failed to parse JSON for ${taskName}`, { error: e, attempt });
          throw new Error(`JSON Parse Error for ${taskName}`);
        }

        if (schema) {
          const validation = schema.safeParse(parsedResult);
          if (!validation.success) {
            const formattedIssues = validation.error.format();

            logger.warn(`[MegaOptimizer] Schema validation failed for ${taskName}`, {
              issues: formattedIssues,
              attempt
            });

            sseEmitter.sendToCurrent({
              type: "substep",
              substep: {
                id: `${taskName.toLowerCase()}_schema_error_attempt_${attempt}` as OptimizationStepId,
                name: `Erro de schema em ${taskName}`,
                description: `Tentativa ${attempt}/${MAX_TASK_RETRIES} falhou na validação de schema. Ver detalhes técnicos nos logs.`,
                status: attempt < MAX_TASK_RETRIES ? "warning" : "error",
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString()
              }
            });

            throw new Error(`Schema Validation Error: ${JSON.stringify(formattedIssues)}`);
          }
          parsedResult = validation.data;
        }

        const duration = Date.now() - totalStart;
        this.taskTimes[taskName] = duration;

        const summary = this.summarizeTaskResult(taskName, parsedResult);
        this.compactHistory = this.compactHistory
          ? `${this.compactHistory}\n${summary}`
          : summary;

        if (this.compactHistory.length > MAX_HISTORY_TOKENS * 3) {
          this.compactHistory = this.compactHistory.substring(this.compactHistory.length - MAX_HISTORY_TOKENS * 2);
        }

        const providerInfo = successfulProvider
          ? `${successfulProvider.provider}/${successfulProvider.model}`
          : 'unknown';
        logger.info(`[MegaOptimizer] Completed task: ${taskName} using ${providerInfo} in ${duration}ms (attempt ${attempt})`);

        sseEmitter.sendToCurrent({
          type: "substep",
          substep: {
            id: `${taskName.toLowerCase()}_attempt_${attempt}` as OptimizationStepId,
            name: `${taskName} concluída (tentativa ${attempt})`,
            status: "success",
            duration,
            endTime: new Date().toISOString()
          }
        });

        return parsedResult;
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const wasAborted = this.abortSignal?.aborted || /abort/i.test(errorMessage || "");

        if (wasAborted) {
          throw error instanceof Error ? error : new Error(errorMessage || `Task ${taskName} aborted`);
        }

        const canRetry = attempt < MAX_TASK_RETRIES && isRetryableTaskError(errorMessage);

        if (canRetry) {
          logger.warn(`[MegaOptimizer] ${taskName} attempt ${attempt} falhou (${errorMessage}). Regenerando...`);
          sseEmitter.sendToCurrent({
            type: "substep",
            substep: {
              id: `${taskName.toLowerCase()}_retry_${attempt}` as OptimizationStepId,
              name: `Retry ${taskName} (${attempt + 1}/${MAX_TASK_RETRIES})`,
              status: "running",
              error: errorMessage,
              startTime: new Date().toISOString()
            }
          });
          continue;
        }

        const failureDuration = Date.now() - totalStart;
        sseEmitter.sendToCurrent({
          type: "substep",
          substep: {
            id: `${taskName.toLowerCase()}_failed` as OptimizationStepId,
            name: `Falha definitiva em ${taskName}`,
            status: "error",
            error: errorMessage,
            duration: failureDuration,
            endTime: new Date().toISOString()
          }
        });

        throw error instanceof Error ? error : new Error(errorMessage || `Task ${taskName} failed`);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Task ${taskName} failed sem detalhes`);
  }

  public async run(): Promise<MegaOptimizerResult> {
    const globalStart = Date.now();

    // Verifica abort antes de iniciar
    if (this.abortSignal?.aborted) {
      throw new Error("Otimização abortada pelo usuário antes de iniciar");
    }

    // OTIMIZAÇÃO: Verificar cache de análise antes de chamar LLM
    let analysisAndPlan = this.getCachedAnalysis();

    if (analysisAndPlan) {
      logger.info("[MegaOptimizer] Usando análise do CACHE - economizando ~30s de LLM");

      // Emitir SSE para UI saber que veio do cache
      sseEmitter.sendToCurrent({
        type: "substep",
        substep: {
          id: "ANALYSIS_AND_PLAN",
          name: "Análise recuperada do cache",
          status: "success",
          duration: 0,
          endTime: new Date().toISOString()
        }
      });
    } else {
      // 1 & 2. Analysis & Plan (Fused for Speed)
      logger.info("[MegaOptimizer] Running Fused Task: ANALYSIS_AND_PLAN");
      analysisAndPlan = await this.executeTask("ANALYSIS_AND_PLAN", AnalysisAndPlanSchema);

      // Cachear resultado para próximas execuções com mesmo script
      this.setCachedAnalysis(analysisAndPlan);
    }

    // Verifica abort após análise
    if (this.abortSignal?.aborted) {
      throw new Error("Otimização abortada após fase de análise");
    }

    const { analysis, plan } = analysisAndPlan;

    // VIRTUAL LOGGING: Simulate individual task completion for UX/Logs consistency
    // This satisfies the user requirement "quero log igual o anterior" while keeping the fusion speed.
    const fusionDuration = this.taskTimes["ANALYSIS_AND_PLAN"] || 0;
    const splitDuration = Math.round(fusionDuration / 2);

    logger.info(`[MegaOptimizer] Completed task: DEEP_ANALYSIS using Fused Strategy in ${splitDuration}ms`);
    logger.info(`[MegaOptimizer] Completed task: STRATEGIC_PLAN using Fused Strategy in ${splitDuration}ms`);

    // Emit SSE for UI consistency
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: { id: "DEEP_ANALYSIS", name: "Completed DEEP_ANALYSIS (Fused)", status: "success", duration: splitDuration, endTime: new Date().toISOString() }
    });
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: { id: "STRATEGIC_PLAN", name: "Completed STRATEGIC_PLAN (Fused)", status: "success", duration: splitDuration, endTime: new Date().toISOString() }
    });

    // CORREÇÃO: Execução sequencial para evitar encavalamento de provedores
    // O paralelismo causava falhas de quota e concorrência no SSE
    logger.info("[MegaOptimizer] Iniciando CODE_GEN e FINAL_DELIVERY em SEQUÊNCIA");

    // Emitir evento de início de CodeGen para UX
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: "CODE_GEN_START",
        name: "Iniciando Geração de Código (Sequencial)",
        status: "running",
        startTime: new Date().toISOString()
      }
    });

    const codeGen = await this.executeTask("CODE_GEN", CodeGenSchema);

    // Emitir evento de transição para Final Delivery
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: "FINAL_DELIVERY_START",
        name: "Iniciando Validação e Documentação",
        status: "running",
        startTime: new Date().toISOString()
      }
    });

    const delivery = await this.executeTask("FINAL_DELIVERY", FinalDeliverySchema);

    logger.info(`[MegaOptimizer] Tarefas sequenciais concluídas`);

    // Sanitize optimizedScript using the same method as input
    if (typeof codeGen.optimizedScript === 'string') {
      codeGen.optimizedScript = QlikOptimizeAgent.sanitizeScript(codeGen.optimizedScript as string);
    }

    const totalTime = Date.now() - globalStart;

    // Coleta estatísticas do orquestrador
    const orchestratorStats = this.orchestrator.getStats();

    // Prepare changes list
    const changes = Array.isArray(codeGen.changesApplied) ? (codeGen.changesApplied as unknown[]) : [];

    // Inject changes into analysis for frontend compatibility (KPIs)
    const analysisObj = typeof analysis === 'object' && analysis !== null ? (analysis as Record<string, unknown>) : {};
    const analysisWithChanges = {
      ...analysisObj,
      changes: changes
    };

    // Inject provider stats into report for transparency
    const reportObj = typeof delivery.report === 'object' && delivery.report !== null ? (delivery.report as Record<string, unknown>) : {};
    const reportWithStats = {
      ...reportObj,
      providerStats: orchestratorStats.providerStats
    };

    return {
      originalScript: this.script,
      optimizedScript: typeof codeGen.optimizedScript === 'string' ? codeGen.optimizedScript : this.script,
      analysis: analysisWithChanges,
      changes: Array.isArray(changes) ? (changes.map((c) => (typeof c === 'object' && c !== null ? (c as Record<string, unknown>) : {})) as Array<Record<string, unknown>>) : [], // Add to root for list view
      plan: typeof plan === 'object' && plan !== null ? (plan as Record<string, unknown>) : {},
      validation: typeof delivery.validation === 'object' && delivery.validation !== null ? (delivery.validation as Record<string, unknown>) : {},
      documentation: typeof delivery.documentation === 'object' && delivery.documentation !== null ? (delivery.documentation as Record<string, unknown>) : {},
      report: reportWithStats,
      metrics: {
        totalTime,
        taskTimes: this.taskTimes,
        providerStats: orchestratorStats.providerStats
      }
    };
  }

  /**
   * Executa otimização granular usando a nova Base de Conhecimento
   */
  public async runGranularOptimization(stepIds: OptimizationStepId[]): Promise<{ finalScript: string; results: import("../types/optimization").StepExecutionResult[] }> {
    const granularOptimizer = new QlikGranularOptimizer(this.script, { signal: this.abortSignal });
    return await granularOptimizer.executeSequence(stepIds);
  }
}
