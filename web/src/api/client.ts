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
const ACCESS_TOKEN_KEY = "qlik-codex-access-token";

function withAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // ignore storage errors
  }
  return headers;
}

/**
 * Generic API client for script management
 */
export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: withAuthHeaders(),
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
      headers: withAuthHeaders(),
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
      headers: withAuthHeaders(),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
};
