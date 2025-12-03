import { generateStructuredJson } from "../lib/llmClient";
import { sseEmitter } from "../lib/sseEmitter";
import { logger } from "../lib/logger";
import { MEGA_SYSTEM_PROMPT, TASK_PROMPTS } from "./megaPrompts";
import { ZodSchema } from "zod";
import { AnalysisAndPlanSchema, CodeGenSchema, FinalDeliverySchema } from "../validators/megaOptimizerSchemas";

interface MegaOptimizerResult {
  originalScript: string;
  optimizedScript: string;
  analysis: any;
  plan: any;
  validation: any;
  documentation: any;
  report: any;
  metrics: {
    totalTime: number;
    taskTimes: Record<string, number>;
  };
}

export class QlikMegaOptimizer {
  private script: string;
  private history: string[] = [];
  private taskTimes: Record<string, number> = {};

  constructor(script: string) {
    // Sanitize input script to remove any HTML tags if the user pasted formatted code
    this.script = script ? script.replace(/<[^>]*>/g, '') : script;
  }

  private async executeTask(taskName: string, promptTemplate: string, schema?: ZodSchema): Promise<any> {
    const startTime = Date.now();
    logger.info(`[MegaOptimizer] Starting task: ${taskName}`);

    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: taskName,
        name: `Executing ${taskName}...`,
        status: "running",
        startTime: new Date().toISOString()
      }
    });

    // Construct the full prompt with history
    const fullPrompt = `
${MEGA_SYSTEM_PROMPT}

--- ORIGINAL SCRIPT ---
${this.script}

--- CONVERSATION HISTORY ---
${this.history.join("\n\n")}

--- CURRENT TASK ---
${promptTemplate}
    `;

    // Fallback Strategy: Gemini 2.5 -> Gemini 2.0 -> Nvidia
    const strategies = [
      { provider: "google", model: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { provider: "google", model: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" },
      { provider: "nvidia", model: undefined, name: "Nvidia Nemotron" }
    ];

    let lastError: any;

    for (const strategy of strategies) {
      try {
        logger.info(`[MegaOptimizer] Attempting task ${taskName} with ${strategy.name}`);

        // Notify UI of model switch if not the first attempt
        if (strategy !== strategies[0]) {
          sseEmitter.sendToCurrent({
            type: "substep",
            substep: {
              id: taskName,
              name: `Fallback to ${strategy.name}...`,
              status: "running",
              startTime: new Date().toISOString()
            }
          });
        }

        // LOG: Context Size & Send Time
        const sendTime = new Date().toISOString();
        logger.info(`[MegaOptimizer] >>> SENDING [${taskName}] to ${strategy.name}`, {
          contextSizeChars: fullPrompt.length,
          sentAt: sendTime
        });

        const result = await generateStructuredJson(fullPrompt, {
          provider: strategy.provider as any,
          model: strategy.model
        });

        const responseText = result.text;

        // LOG: Response Size & Receive Time
        const receiveTime = new Date().toISOString();
        logger.info(`[MegaOptimizer] <<< RECEIVED [${taskName}] from ${strategy.name}`, {
          responseSizeChars: responseText.length,
          receivedAt: receiveTime,
          durationMs: Date.now() - new Date(sendTime).getTime()
        });

        // Try to parse JSON
        let parsedResult: any;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
          parsedResult = JSON.parse(jsonStr);
        } catch (e) {
          logger.warn(`[MegaOptimizer] Failed to parse JSON from ${strategy.name}`, { error: e });
          throw new Error(`JSON Parse Error from ${strategy.name}`);
        }

        // Validate Schema if provided
        if (schema) {
          const validation = schema.safeParse(parsedResult);
          if (!validation.success) {
            logger.warn(`[MegaOptimizer] Schema validation failed for ${taskName} with ${strategy.name}`, { issues: validation.error.format() });
            throw new Error(`Schema Validation Error: ${JSON.stringify(validation.error.format())}`);
          }
          parsedResult = validation.data;
        }

        // Success!
        const duration = Date.now() - startTime;
        this.taskTimes[taskName] = duration;

        this.history.push(`USER REQUEST: ${promptTemplate}`);
        this.history.push(`AI RESPONSE: ${responseText}`);

        logger.info(`[MegaOptimizer] Completed task: ${taskName} using ${strategy.name} in ${duration}ms`);

        sseEmitter.sendToCurrent({
          type: "substep",
          substep: {
            id: taskName,
            name: `Completed ${taskName}`,
            status: "success",
            duration,
            endTime: new Date().toISOString()
          }
        });

        return parsedResult;

      } catch (error) {
        lastError = error;
        logger.warn(`[MegaOptimizer] Strategy ${strategy.name} failed for ${taskName}`, { error });
        // Continue to next strategy
      }
    }

    // If we got here, all strategies failed
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: taskName,
        name: `Failed ${taskName}`,
        status: "error",
        error: lastError?.message || "All models failed",
        endTime: new Date().toISOString()
      }
    });

    throw lastError || new Error(`Task ${taskName} failed after all fallbacks`);
  }

  public async run(): Promise<MegaOptimizerResult> {
    const globalStart = Date.now();

    // 1 & 2. Analysis & Plan (Fused for Speed)
    logger.info("[MegaOptimizer] Running Fused Task: ANALYSIS_AND_PLAN");
    const analysisAndPlan = await this.executeTask("ANALYSIS_AND_PLAN", TASK_PROMPTS.ANALYSIS_AND_PLAN, AnalysisAndPlanSchema);
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

    // 3. Code Generation
    const codeGen = await this.executeTask("CODE_GEN", TASK_PROMPTS.CODE_GEN, CodeGenSchema);

    // Sanitize optimizedScript to remove any HTML tags if the LLM hallucinated them
    // This prevents double-escaping issues in the frontend report
    if (codeGen.optimizedScript) {
      codeGen.optimizedScript = codeGen.optimizedScript.replace(/<[^>]*>/g, '');
    }

    // 4. Final Delivery (Validation + Docs + Report)
    const delivery = await this.executeTask("FINAL_DELIVERY", TASK_PROMPTS.FINAL_DELIVERY, FinalDeliverySchema);

    const totalTime = Date.now() - globalStart;

    return {
      originalScript: this.script,
      optimizedScript: codeGen.optimizedScript || this.script,
      analysis,
      plan,
      validation: delivery.validation,
      documentation: delivery.documentation,
      report: delivery.report,
      metrics: {
        totalTime,
        taskTimes: this.taskTimes
      }
    };
  }
}
