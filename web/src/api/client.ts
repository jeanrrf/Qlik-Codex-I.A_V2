// web/src/api/client.ts
import {
  LLMProviderName,
  OptimizeMode,
  OptimizeScriptApiResponse,
  OptimizeScriptRequestBody
} from "../types/api";
import { optimizeScript as postOptimizeScript } from "../lib/apiClient";

interface OptimizeOptions {
  llmProvider?: LLMProviderName;
  llmModel?: string;
}

export async function optimizeScript(
  script: string,
  mode: OptimizeMode,
  options?: OptimizeOptions
): Promise<OptimizeScriptApiResponse> {
  const payload: OptimizeScriptRequestBody = {
    script,
    mode,
    llmProvider: options?.llmProvider,
    llmModel: options?.llmModel
  };
  return postOptimizeScript(payload);
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Generic API client for script management
 */
export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: JSON_HEADERS,
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  },

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: JSON_HEADERS,
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
};
