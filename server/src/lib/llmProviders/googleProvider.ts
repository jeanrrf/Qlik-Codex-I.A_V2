import { GoogleGenAI } from "@google/genai";

import { config } from "../config";
import { logger } from "../logger";
import { withTimeout } from "../resilience";
import type {
  LLMProvider,
  ProviderResult,
  ProviderCallOptions
} from "./types";

const MODEL_NAME = "gemini-2.5-flash";

let client: GoogleGenAI | undefined;

if (config.geminiApiKey) {
  client = new GoogleGenAI({
    apiKey: config.geminiApiKey
  });
}

async function generate(prompt: string): Promise<ProviderResult> {
  if (!client) {
    throw new Error("Google Gemini client not configured");
  }

  // Adiciona timeout de 120s para LLMs grandes
  const response = await withTimeout(
    client.models.generateContent({
      model: MODEL_NAME,
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
    120000, // 120s timeout para LLMs grandes
    'Google Gemini API'
  );

  if (!response.text) {
    throw new Error("Google provider returned empty text");
  }

  return {
    text: response.text,
    provider: "google",
    metadata: {
      model: MODEL_NAME
    }
  };
}

export const googleProvider: LLMProvider = {
  name: "google",
  isAvailable: () => Boolean(client),
  generateStructuredJson: async (prompt: string, _options?: ProviderCallOptions) => {
    try {
      return await generate(prompt);
    } catch (error) {
      logger.error("Google LLM provider failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
};
