/**
 * 📖 QLIK DOC AGENT — Technical Documentation Generator
 * 
 * Uses AINEX Unified Prompt System v2.0
 * Generates comprehensive technical documentation from Qlik scripts
 */

import { z } from "zod";

import { logger } from "../lib/logger";
import { defaultOrchestrator } from "../lib/providerOrchestrator";
import { buildDocumentationPrompt, PROMPT_VERSION, DocumentationSchema } from "../prompts";
import type { LLMOptions } from "../types/optimization";

// Re-export schema for compatibility
export const DocSchema = DocumentationSchema;

export interface QlikDocResult {
  markdown: string;
  metadata: z.infer<typeof DocumentationSchema>;
}

export async function runQlikDocAgent(
  script: string,
  _llmOptions?: LLMOptions
): Promise<QlikDocResult> {
  logger.info(`[DocAgent] Starting documentation generation (Prompt v${PROMPT_VERSION})`);

  const prompt = buildDocumentationPrompt(script);

  try {
    // Use orchestrator for robust execution
    const result = await defaultOrchestrator.executeWithRotation(
      "result_111_create_documentation",
      prompt,
      60000 // 60s timeout
    );

    if (result.fallbackTriggered || !result.result) {
      throw new Error(result.fallbackReason || "Failed to generate documentation");
    }

    const text = result.result;
    const parsed = JSON.parse(text);
    const data = DocumentationSchema.parse(parsed);

    const markdown = `
# ${data.title}

## 📋 Visão Geral
${data.description}

## 🏗️ Modelo de Dados (Mermaid)
\`\`\`mermaid
${data.diagram_mermaid}
\`\`\`

## 📊 Tabelas e Estrutura

${data.tables.map(t => `### 🔹 ${t.name}
*${t.description}*
- **Fonte:** ${t.source || 'N/A'}
- **Campos Chave:** ${t.fields.slice(0, 5).join(', ')}${t.fields.length > 5 ? '...' : ''}
`).join('\n')}

## 🔄 Estratégia de Recarga
${data.reload_strategy}

## 📈 Métricas Identificadas
${data.key_metrics.map(m => `- ${m}`).join('\n')}

---
*Documentação gerada automaticamente por AINEX Qlik Codex I.A*
`.trim();

    return {
      markdown,
      metadata: data
    };

  } catch (error) {
    logger.error("Error in QlikDocAgent", { error });
    throw error;
  }
}
