export type ProviderName = "google" | "nvidia";

export interface ProviderResult {
  text: string;
  provider: ProviderName;
  metadata?: Record<string, unknown>;
}

export interface ProviderCallOptions {
  model?: string;
  signal?: AbortSignal;
}

export interface LLMProvider {
  name: ProviderName;
  isAvailable(): boolean;
  generateStructuredJson(
    prompt: string,
    options?: ProviderCallOptions
  ): Promise<ProviderResult>;
}
