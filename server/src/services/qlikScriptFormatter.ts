/**
 * 🚀 QLIK SCRIPT FORMATTER — Ferramenta Gratuita
 * 
 * Estratégia: LLM faz 100% da formatação
 * Sem lógica hardcoded, sem fallback complexo
 * Prompt inteligente + Modelo = Formatação profissional
 * 
 * Now using the unified AINEX Prompt System v2.0
 */

import { logger } from "../lib/logger";
import { defaultOrchestrator } from "../lib/providerOrchestrator";
import { buildFormatterPrompt, PROMPT_VERSION } from "../prompts";

export interface FormatterResult {
  formattedScript: string;
  notes: string[];
  provider: "llm";
}

/**
 * Formatador principal - 100% baseado em LLM
 * Uses AINEX Unified Prompt System v2.0
 */
export async function formatQlikScript(script: string): Promise<FormatterResult> {
  logger.info(`[Formatter] Starting format operation (Prompt v${PROMPT_VERSION})`);

  try {
    const prompt = buildFormatterPrompt(script.trim());

    // Usando orquestrador para respeitar rotação/timeout
    const response = await defaultOrchestrator.executeWithRotation(
      // We don't have a dedicated 'formatter' step id so reuse a quality step that reflects formatting
      "quality_067_indentation_fix",
      prompt,
      60000 // 60s
    );

    if (response.fallbackTriggered || !response.result) {
      throw new Error(response.fallbackReason || "LLM retornou vazio");
    }

    const text = response.result;

    // Limpeza robusta de Markdown antes do parse
    const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();

    let parsed: { formattedScript?: string; notes?: string[] };
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      // Tenta extrair JSON se houver texto antes/depois
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw e;
      }
    }

    if (!parsed.formattedScript) throw new Error("Resposta sem formattedScript");

    return {
      formattedScript: parsed.formattedScript.trim(),
      notes: parsed.notes || ["Formatado com sucesso"],
      provider: "llm"
    };
  } catch (error) {
    logger.error("Formatter falhou", { error });

    // Fallback minimalista: retorna original
    return {
      formattedScript: script.trim(),
      notes: ["Erro na formatação. Script original retornado."],
      provider: "llm"
    };
  }
}
