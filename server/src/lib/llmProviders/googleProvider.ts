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

let client: GoogleGenAI | undefined;

if (config.geminiApiKey) {
  client = new GoogleGenAI({
    apiKey: config.geminiApiKey
  });
}

async function generate(prompt: string, options?: ProviderCallOptions): Promise<ProviderResult> {
  if (!client) {
    throw new Error("Google Gemini client not configured");
  }

  const modelToUse = options?.model || MODEL_NAME;

  // OTIMIZAÇÃO: Timeout reduzido para fail-fast (era 120s, agora 45s)
  // Permite rotação mais rápida para próximo provider em caso de lentidão
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
        maxOutputTokens: 65536,
        temperature: 0.1,
      }
    }),
    45000, // 45s timeout - fail-fast para rotação de provider
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
