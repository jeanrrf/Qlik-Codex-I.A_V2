/**
 * Agent Factory - Elimina duplicação de código entre agentes LLM
 * Todos os 5 agentes (Optimize, Review, Explain, Consultancy, Doc)
 * compartilham o mesmo padrão: buildPrompt → generateStructuredJson → validate
 * 
 * Este factory consolida esse padrão em uma classe genérica reutilizável.
 */

import { ZodSchema } from "zod";
import { generateStructuredJson, GenerateStructuredJsonOptions } from "./llmClient";
import { logger } from "./logger";

/**
 * Interface genérica para resultado de agente LLM
 */
export interface AgentResult {
  [key: string]: any;
}

/**
 * Configuração de um agente
 */
export interface AgentConfig<T extends AgentResult> {
  /** Nome do agente para logging */
  name: string;
  /** Função que constrói o prompt */
  buildPrompt: (...args: any[]) => string;
  /** Schema Zod para validação */
  schema: ZodSchema;
  /** Mapeador opcional do JSON bruto para o tipo esperado */
  mapResponse?: (raw: any) => T;
  /** Fallback response em caso de erro */
  fallbackResponse?: T;
}

/**
 * Classe genérica que executa qualquer agente LLM
 * Elimina 90% do boilerplate dos agentes individuais
 */
export class GenericLLMAgent<T extends AgentResult> {
  private config: AgentConfig<T>;

  constructor(config: AgentConfig<T>) {
    this.config = config;
  }

  /**
   * Executa o agente com tratamento de erro centralizado
   */
  async run(
    promptArgs: any[],
    llmOptions?: GenerateStructuredJsonOptions
  ): Promise<T> {
    const startTime = Date.now();
    const agentName = this.config.name;

    try {
      logger.info(`[${agentName}] Iniciando execução`, { args: promptArgs });

      // Build prompt
      const prompt = this.config.buildPrompt(...promptArgs);
      logger.debug(`[${agentName}] Prompt construído`, { promptLength: prompt.length });

      // Call LLM
      const { text } = await generateStructuredJson(prompt, llmOptions);

      if (!text) {
        logger.warn(`[${agentName}] LLM retornou texto vazio`);
        return this.config.fallbackResponse || ({} as T);
      }

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        logger.error(`[${agentName}] Falha ao fazer parse de JSON`, {
          error: String(parseErr),
          textPreview: text.substring(0, 200)
        });
        return this.config.fallbackResponse || ({} as T);
      }

      // Validate schema
      const validated = this.config.schema.safeParse(parsed);
      if (!validated.success) {
        logger.error(`[${agentName}] Schema validation falhou`, {
          issues: validated.error.format()
        });
        return this.config.fallbackResponse || ({} as T);
      }

      // Map response if needed
      const result = this.config.mapResponse
        ? this.config.mapResponse(validated.data)
        : (validated.data as T);

      const duration = Date.now() - startTime;
      logger.info(`[${agentName}] Execução concluída com sucesso`, { durationMs: duration });

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error(`[${agentName}] Erro não tratado`, {
        error: String(err),
        durationMs: duration
      });
      return this.config.fallbackResponse || ({} as T);
    }
  }
}

/**
 * Helper para criar agentes sem boilerplate
 */
export function createAgent<T extends AgentResult>(config: AgentConfig<T>): GenericLLMAgent<T> {
  return new GenericLLMAgent(config);
}
