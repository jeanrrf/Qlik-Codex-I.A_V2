// web/src/lib/apiClient.ts
import {
  OptimizeScriptApiResponse,
  OptimizeScriptRequestBody,
  QlikFormatterRequestBody,
  QlikFormatterResponse
} from "../types/api";

export async function optimizeScript(
  body: OptimizeScriptRequestBody
): Promise<OptimizeScriptApiResponse> {
  const resp = await fetch("/api/scripts/optimize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(body)
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

  const data = (await resp.json()) as OptimizeScriptApiResponse;
  return data;
}

export async function requestQlikFormatter(
  body: QlikFormatterRequestBody
): Promise<QlikFormatterResponse> {
  const resp = await fetch("/api/tools/qlik-formatter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    try {
      const errJson = await resp.json();
      if (errJson?.error) {
        throw new Error(errJson.error);
      }
    } catch (_parseErr) {
      // ignore parse error and throw generic message
    }
    throw new Error("Falha ao acionar a AINEX para formatar o script.");
  }

  const result = (await resp.json()) as QlikFormatterResponse;
  return result;
}

export async function requestQlikFormatterStream(
  body: QlikFormatterRequestBody,
  onProgress?: (percent: number, message?: string) => void
): Promise<QlikFormatterResponse> {
  const resp = await fetch("/api/tools/qlik-formatter/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    try {
      const errJson = await resp.json();
      if (errJson?.error) {
        throw new Error(errJson.error);
      }
    } catch (_parseErr) {
      // ignore parse error and throw generic message
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
      } catch (_err) {
        // ignore transient parse errors
      }
    }

    buffer = chunks[chunks.length - 1];
  }

  if (!lastResult) throw new Error("Servidor não retornou resultado do formatter.");
  return lastResult;
}
