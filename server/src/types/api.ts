import { ProviderName } from "../lib/llmProviders/types";

import { OptimizeMode, OptimizeResult } from "./qlik";

/** Intent: "audit" para análise sem geração de código, "refactor" para otimização completa */
export type OptimizationIntent = "audit" | "refactor";

export interface OptimizeScriptRequestBody {
  script: string;
  mode: OptimizeMode;
  userId?: string;
  // frontend may send the logical agent 'ainex' to indicate the AINEX pipeline
  llmProvider?: ProviderName | "ainex";
  llmModel?: string;
  enableRealTimeProgress?: boolean; // habilita streaming de progresso
  // ✨ FREE TIER: Campos de truncamento inteligente (adicionados pelo middleware)
  applySmartTruncation?: boolean;
  lineLimit?: number;
  /** Intent: "audit" para análise sem código, "refactor" para otimização completa */
  intent?: OptimizationIntent;
}

export interface OptimizeScriptApiResponse extends OptimizeResult {
  status: "done";
}
