import {
  LLMProviderName,
  OptimizeMode,
  OptimizeScriptApiResponse,
  OptimizeScriptRequestBody,
  QlikFormatterRequestBody,
  QlikFormatterResponse
} from "../types/api";

const JSON_HEADERS = { "Content-Type": "application/json" };
const ACCESS_TOKEN_KEY = "qlik-codex-access-token";
// Default backend base (Render). Can be overridden via VITE_API_BASE_URL at build time.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://qlik-codex-i-a-v2.onrender.com/api";

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...JSON_HEADERS };
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ignore storage errors
  }
  return headers;
}

export function resolveApiUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return endpoint;
  const base = API_BASE.endsWith("/") ? API_BASE.slice(0, -1) : API_BASE;
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

interface OptimizeOptions {
  llmProvider?: LLMProviderName;
  llmModel?: string;
}

// --- Core API Functions ---

export async function optimizeScript(
  script: string,
  mode: OptimizeMode,
  options?: OptimizeOptions
): Promise<OptimizeScriptApiResponse> {
  const payload: OptimizeScriptRequestBody & { encoding?: string } = {
    script: btoa(unescape(encodeURIComponent(script))),
    mode,
    llmProvider: options?.llmProvider,
    llmModel: options?.llmModel,
    encoding: "base64"
  };

  const resp = await fetch(resolveApiUrl("/scripts/optimize"), {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    let message = "Falha ao otimizar script.";
    try {
      const errJson = await resp.json();
      if (errJson?.error) {
        message = errJson.error;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return (await resp.json()) as OptimizeScriptApiResponse;
}

export async function requestQlikFormatter(
  body: QlikFormatterRequestBody
): Promise<QlikFormatterResponse> {
  const resp = await fetch(resolveApiUrl("/tools/qlik-formatter"), {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    try {
      const errJson = await resp.json();
      if (errJson?.error) {
        throw new Error(errJson.error);
      }
    } catch {
      // ignore parse error
    }
    throw new Error("Falha ao acionar a AINEX para formatar o script.");
  }

  return (await resp.json()) as QlikFormatterResponse;
}

export async function requestQlikFormatterStream(
  body: QlikFormatterRequestBody,
  onProgress?: (percent: number, message?: string) => void
): Promise<QlikFormatterResponse> {
  const resp = await fetch(resolveApiUrl("/tools/qlik-formatter/stream"), {
    method: "POST",
    headers: getAuthHeaders(),
    credentials: "include",
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    try {
      const errJson = await resp.json();
      if (errJson?.error) {
        throw new Error(errJson.error);
      }
    } catch {
      // ignore parse error
    }
    throw new Error("Falha ao acionar a AINEX para formatar o script.");
  }

  const reader = resp.body?.getReader();
  if (!reader) {
    throw new Error("Resposta inválida do servidor");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let lastResult: QlikFormatterResponse | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    for (let i = 0; i < chunks.length - 1; i++) {
      const chunk = chunks[i];
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      let evt = "message";
      let payload = "";
      for (const l of lines) {
        if (l.startsWith("event:")) evt = l.replace("event:", "").trim();
        if (l.startsWith("data:")) payload += l.replace("data:", "").trim();
      }

      if (!payload) continue;

      try {
        const parsed = JSON.parse(payload);
        if (evt === "progress") {
          onProgress?.(parsed.percent ?? 0, parsed.message ?? "");
        } else if (evt === "result") {
          lastResult = parsed as QlikFormatterResponse;
        } else if (evt === "error") {
          throw new Error(parsed?.error || "Erro no stream do formatter");
        }
      } catch {
        // ignore transient parse errors
      }
    }

    buffer = chunks[chunks.length - 1];
  }

  if (!lastResult) throw new Error("Servidor não retornou resultado do formatter.");
  return lastResult;
}

// --- Generic API Client ---

export const apiClient = {
  async get<T>(endpoint: string, options?: { bustCache?: boolean }): Promise<T> {
    const headers: Record<string, string> = {
      ...getAuthHeaders(),
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    };

    const target = resolveApiUrl(endpoint);
    const url = options?.bustCache
      ? `${target}${target.includes("?") ? "&" : "?"}_=${Date.now()}`
      : target;

    const response = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  },

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(resolveApiUrl(endpoint), {
      method: "POST",
      headers: getAuthHeaders(),
      credentials: "include",
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  },

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(resolveApiUrl(endpoint), {
      method: "DELETE",
      headers: getAuthHeaders(),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
};
