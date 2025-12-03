import { generateStructuredJson } from "../lib/llmClient";
import { sseEmitter } from "../lib/sseEmitter";
import { logger } from "../lib/logger";
import { MEGA_SYSTEM_PROMPT, TASK_PROMPTS } from "./megaPrompts";

interface MegaOptimizerResult {
  originalScript: string;
  optimizedScript: string;
  analysis: any;
  plan: any;
  validation: any;
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
    this.script = script;
  }

  private async executeTask(taskName: string, promptTemplate: string): Promise<any> {
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

        const result = await generateStructuredJson(fullPrompt, {
          provider: strategy.provider as any,
          model: strategy.model
        });

        const responseText = result.text;

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

    // 1. Deep Analysis
    const analysis = await this.executeTask("DEEP_ANALYSIS", TASK_PROMPTS.DEEP_ANALYSIS);

    // 2. Strategic Plan
    const plan = await this.executeTask("STRATEGIC_PLAN", TASK_PROMPTS.STRATEGIC_PLAN);

    // 3. Code Generation
    const codeGen = await this.executeTask("CODE_GEN", TASK_PROMPTS.CODE_GEN);

    // 4. Validation
    const validation = await this.executeTask("VALIDATION", TASK_PROMPTS.VALIDATION);

    // 5. Final Report
    const report = await this.executeTask("FINAL_REPORT", TASK_PROMPTS.FINAL_REPORT);

    const totalTime = Date.now() - globalStart;

    return {
      originalScript: this.script,
      optimizedScript: codeGen.optimizedScript || this.script,
      analysis,
      plan,
      validation,
      report,
      metrics: {
        totalTime,
        taskTimes: this.taskTimes
      }
    };
  }
}
