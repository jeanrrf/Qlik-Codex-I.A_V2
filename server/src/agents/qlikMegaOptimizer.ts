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

  private async executeTask(taskName: string, promptTemplate: string, maxRetries = 2): Promise<any> {
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

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        if (attempt > 1) {
          logger.warn(`[MegaOptimizer] Retrying task ${taskName} (Attempt ${attempt}/${maxRetries + 1})`);
          sseEmitter.sendToCurrent({
            type: "substep",
            substep: {
              id: taskName,
              name: `Retrying ${taskName} (${attempt}/${maxRetries + 1})...`,
              status: "running",
              startTime: new Date().toISOString()
            }
          });
        }

        // Use Gemini 1.5 Pro (or 2.5 Flash when available) via the 'google' provider
        // We request JSON output.
        const result = await generateStructuredJson(fullPrompt, {
          provider: "google",
          model: "gemini-1.5-pro-latest" // Using the best available model for large context
        });

        const responseText = result.text;

        // Try to parse JSON
        let parsedResult: any;
        try {
          // Sometimes LLMs wrap JSON in markdown code blocks
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
          parsedResult = JSON.parse(jsonStr);
        } catch (e) {
          logger.warn(`[MegaOptimizer] Failed to parse JSON for ${taskName} on attempt ${attempt}`, { error: e });
          if (attempt === maxRetries + 1) {
            throw new Error(`Failed to parse JSON response from LLM after ${attempt} attempts.`);
          }
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue; // Try again
        }

        // Success!
        const duration = Date.now() - startTime;
        this.taskTimes[taskName] = duration;

        this.history.push(`USER REQUEST: ${promptTemplate}`);
        this.history.push(`AI RESPONSE: ${responseText}`);

        logger.info(`[MegaOptimizer] Completed task: ${taskName} in ${duration}ms`);

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
        logger.error(`[MegaOptimizer] Error in task ${taskName} attempt ${attempt}`, { error });
        if (attempt === maxRetries + 1) break;
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // If we got here, all retries failed
    sseEmitter.sendToCurrent({
      type: "substep",
      substep: {
        id: taskName,
        name: `Failed ${taskName}`,
        status: "error",
        error: lastError?.message || "Unknown error",
        endTime: new Date().toISOString()
      }
    });

    throw lastError || new Error(`Task ${taskName} failed after retries`);
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
