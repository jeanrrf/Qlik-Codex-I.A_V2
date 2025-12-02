import { LLMProviderName } from "../types/api";

export interface LLMOption {
  id: string;
  title: string;
  description: string;
  provider: LLMProviderName;
  model?: string;
  badge?: string;
  params?: string;
  isDefault?: boolean;
}

export const LLM_OPTIONS: LLMOption[] = [
  {
    id: "ainex",
    title: "AINEX — Agent Intelligent Neural Expert",
    description: "AINEX é nossa persona e agente especialista em otimização de scripts Qlik. A interface usa AINEX enquanto o backend gerencia provedores e fallbacks.",
    provider: "ainex" as LLMProviderName,
    badge: "AINEX",
    isDefault: true
  }
];

export function getLLMOptionById(optionId: string): LLMOption {
  return (
    LLM_OPTIONS.find((option) => option.id === optionId) ?? LLM_OPTIONS[0]
  );
}

export function getDefaultLLMOption(): LLMOption {
  return LLM_OPTIONS.find((option) => option.isDefault) ?? LLM_OPTIONS[0];
}

export function getNvidiaModels(): LLMOption[] {
  return LLM_OPTIONS.filter((option) => option.provider === "nvidia");
}
