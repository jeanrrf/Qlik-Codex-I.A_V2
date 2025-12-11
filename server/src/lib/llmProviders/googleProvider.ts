import { GoogleGenAI } from "@google/genai";

import { config } from "../config";
import { logger } from "../logger";
import { withTimeout } from "../resilience";
import type {
  LLMProvider,
  ProviderResult,
  ProviderCallOptions
} from "./types";

const MODEL_NAME = config.geminiModel;
const DEFAULT_MAX_OUTPUT_TOKENS = config.geminiDefaultMaxOutputTokens || 8192;
const TASK_TYPE_MAX_OUTPUT_TOKENS: Record<string, number> = {
  long_form: config.geminiExtendedMaxOutputTokens,
  documentation: config.geminiExtendedMaxOutputTokens,
  formatting: config.geminiExtendedMaxOutputTokens
};

let client: GoogleGenAI | undefined;

if (config.geminiApiKey) {
  client = new GoogleGenAI({
    apiKey: config.geminiApiKey
  });
}

function resolveMaxOutputTokens(options?: ProviderCallOptions): {
  maxOutputTokens: number;
  source: string;
} {
  if (options?.maxOutputTokens && options.maxOutputTokens > 0) {
    return { maxOutputTokens: options.maxOutputTokens, source: "explicit_option" };
  }

  if (options?.taskType) {
    const taskLimit = TASK_TYPE_MAX_OUTPUT_TOKENS[options.taskType];
    if (taskLimit) {
      return { maxOutputTokens: taskLimit, source: `taskType:${options.taskType}` };
    }
  }

  return { maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS, source: "default" };
}

async function generate(prompt: string, options?: ProviderCallOptions): Promise<ProviderResult> {
  if (!client) {
    throw new Error("Google Gemini client not configured");
  }

  const modelToUse = options?.model || MODEL_NAME;
  const { maxOutputTokens, source } = resolveMaxOutputTokens(options);

  logger.info("Google LLM: max output tokens applied", {
    model: modelToUse,
    maxOutputTokens,
    source,
    taskType: options?.taskType
  });

  // OTIMIZAÇÃO: Timeout de 60s para Gemini 2.5 Flash
  // Gemini é rápido mas scripts grandes podem demorar
  const response = await withTimeout(
    client.models.generateContent({
      model: modelToUse,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        maxOutputTokens,
        temperature: 0.1,
      }
    }),
    60000, // 60s timeout - balanceado para scripts grandes
    'Google Gemini API'
  );

  if (!response.text) {
    throw new Error("Google provider returned empty text");
  }

  return {
    text: response.text,
    provider: "google",
    metadata: {
      model: modelToUse
    }
  };
}

export const googleProvider: LLMProvider = {
  name: "google",
  isAvailable: () => Boolean(client),
  generateStructuredJson: async (prompt: string, options?: ProviderCallOptions) => {
    try {
      return await generate(prompt, options);
    } catch (error) {
      logger.error("Google LLM provider failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
};
