import { ProviderName } from "../lib/llmProviders/types";

import { OptimizeMode, OptimizeResult } from "./qlik";

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
}

export interface OptimizeScriptApiResponse extends OptimizeResult {
  status: "done";
}
