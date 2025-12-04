import { config } from "../config";
import { logger } from "../logger";
import { withTimeout, LLMError } from "../resilience";
import type {
  LLMProvider,
  ProviderCallOptions,
  ProviderResult
} from "./types";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

// Helper to extract JSON from potentially messy text (markdown, thinking blocks, etc)
function extractJsonFromText(text: string): string {
  // 1. Try to find JSON inside markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1];
  }

  // 2. If no code block, try to find the first '{' and last '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  // 3. Return original text if no structure found (will likely fail JSON.parse later)
  return text;
}

type NvidiaContentPart = {
  type?: string;
  text?: string;
  content?: string | object;
  value?: string | object;
  json?: object;
};

type NvidiaMessageContent = string | Array<string | NvidiaContentPart>;

interface NvidiaChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: NvidiaMessageContent;
    };
  }>;
}

export function extractContent(content?: NvidiaMessageContent): string | undefined {
  if (!content) return undefined;

  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  const parts: string[] = [];

  for (const chunk of content) {
    if (typeof chunk === "string") {
      parts.push(chunk);
      continue;
    }

    // Common fields that may contain textual content
    if (typeof chunk.text === "string" && chunk.text.trim().length > 0) {
      parts.push(chunk.text);
      continue;
    }

    if (typeof chunk.content === "string" && chunk.content.trim().length > 0) {
      parts.push(chunk.content);
      continue;
    }

    if (typeof (chunk as any).value === "string" && (chunk as any).value.trim().length > 0) {
      parts.push((chunk as any).value);
      continue;
    }

    // If the provider returned a structured object under value/json/content, serialize it
    const objectCandidate = (chunk as any).value ?? (chunk as any).json ?? (chunk as any).content;
    if (objectCandidate && typeof objectCandidate === "object") {
      try {
        parts.push(JSON.stringify(objectCandidate));
      } catch (_) {
        // ignore
      }
    }
  }

  // When content is an array (e.g. multimodal or specific model formatting), 
  // parts are usually distinct blocks. Joining with newline is safer than empty string
  // to avoid "jumbled" text (encavalado), especially for models like Llama 3 on NVIDIA NIM.
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : undefined;
}

async function callNvidiaWithModel(
  prompt: string,
  modelName: string
): Promise<ProviderResult> {
  const endpoint = `${NVIDIA_BASE_URL}/chat/completions`;

  logger.info("NVIDIA API: Tentando modelo", { model: modelName });

  // OTIMIZAÇÃO: Timeout de 60s para Kimi K2 (modelo grande com reasoning)
  // Kimi K2 é um modelo MoE de 1T parâmetros com capacidades avançadas
  const response = await withTimeout(
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${config.nvidiaApiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content:
              "Você é o QLIK CODEX I.A, um otimizador especialista de scripts Qlik. Responda APENAS com o JSON solicitado, sem explicações adicionais fora da estrutura JSON."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.15,
        top_p: 0.95,
        max_tokens: 16384,  // Aumentado para scripts grandes
        stream: false
      })
    }),
    60000, // 60s timeout - Kimi K2 precisa de mais tempo para reasoning
    'NVIDIA NIM API'
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new LLMError(
      `NVIDIA API ${response.status}: ${response.statusText} - ${errorText}`,
      'nvidia',
      modelName,
      response.status,
      response.status >= 500 || response.status === 429 // Retryable
    );
  }

  const data = (await response.json()) as NvidiaChatCompletionResponse;

  logger.info("NVIDIA API: Resposta recebida", {
    model: modelName,
    hasChoices: !!data?.choices,
    choicesLength: data?.choices?.length || 0,
    hasMessage: !!data?.choices?.[0]?.message,
    contentType: typeof data?.choices?.[0]?.message?.content
  });

  const rawText = extractContent(data?.choices?.[0]?.message?.content);

  if (!rawText) {
    // Check if we have reasoning content but no actual content (common in Thinking models that timeout or fail)
    const reasoning = (data?.choices?.[0]?.message as any)?.reasoning_content;

    // Log completo para debug
    logger.error("NVIDIA provider: Conteúdo vazio ou inválido", {
      model: modelName,
      rawResponse: JSON.stringify(data).substring(0, 500),
      messageContent: data?.choices?.[0]?.message?.content,
      hasReasoning: !!reasoning,
      reasoningSnippet: reasoning ? String(reasoning).substring(0, 200) : undefined
    });

    if (reasoning && !rawText) {
      throw new Error("NVIDIA provider returned only reasoning content (thinking) but no final answer. The model may have timed out or failed to converge.");
    }

    throw new Error("NVIDIA provider returned empty content");
  }

  // Extract JSON from the raw text (which might include thinking/markdown)
  const jsonText = extractJsonFromText(rawText);

  return {
    text: jsonText,
    provider: "nvidia",
    metadata: {
      model: modelName,
      endpoint,
      rawOutputLength: rawText.length
    }
  };
}

async function callNvidia(
  prompt: string,
  options?: ProviderCallOptions
): Promise<ProviderResult> {
  if (!config.nvidiaApiKey) {
    throw new Error("NVIDIA_API_KEY não configurada");
  }

  // Use the requested model or fall back to config default
  // We no longer force a specific "Thinking" model hardcoded here.
  const modelToUse = options?.model ?? config.nvidiaModel;

  return callNvidiaWithModel(prompt, modelToUse);
}

export const nvidiaProvider: LLMProvider = {
  name: "nvidia",
  isAvailable: () => Boolean(config.nvidiaApiKey),
  generateStructuredJson: async (prompt: string, options?: ProviderCallOptions) => {
    try {
      return await callNvidia(prompt, options);
    } catch (error) {
      logger.error("NVIDIA LLM provider failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
};
