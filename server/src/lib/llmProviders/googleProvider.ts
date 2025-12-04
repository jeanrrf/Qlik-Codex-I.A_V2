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
const GEMINI_TIMEOUT_MS = 150000; // 2.5 minutos para prompts muito grandes

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal, operation = "Google Gemini API"): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(new Error(`${operation} aborted by signal`));
  }

  return new Promise<T>((resolve, reject) => {
    const abortHandler = () => {
      signal.removeEventListener("abort", abortHandler);
      reject(new Error(`${operation} aborted by signal`));
    };

    signal.addEventListener("abort", abortHandler, { once: true });

    promise
      .then((value) => {
        signal.removeEventListener("abort", abortHandler);
        resolve(value);
      })
      .catch((error) => {
        signal.removeEventListener("abort", abortHandler);
        reject(error);
      });
  });
}

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

  // Timeout maior para evitar aborts prematuros em scripts grandes
  const timedResponse = withTimeout(
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
    GEMINI_TIMEOUT_MS,
    'Google Gemini API'
  );

  const response = await raceWithAbort(timedResponse, options?.signal, "Google Gemini API");

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
