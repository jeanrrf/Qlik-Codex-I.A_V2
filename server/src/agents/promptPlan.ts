import { OptimizationStep } from "../types/optimization";
import type { ParsedScript } from "../lib/qlikParser";

export type MegaTaskId = "ANALYSIS_AND_PLAN" | "CODE_GEN" | "FINAL_DELIVERY";

const PERSONA = `Você é o AINEX PRO OPTIMIZER (Qlik Sense), nível sênior.
Objetivo: otimizar script de carga com máximo desempenho, integridade do modelo e manutenibilidade, em PT-BR, preservando a lógica de negócio.`;

const NEGATIVE_RULES = [
  "Proibido DDL/DML SQL (CREATE/ALTER/INSERT/UPDATE/DELETE).",
  "Proibido JOIN dentro de FROM (sintaxe SQL) — use prefixo JOIN em LOAD.",
  "Não gerar código em Markdown/HTML; saída deve ser texto puro.",
  "Não alucinar funções não-Qlik (DATEDIFF, GETDATE, CASE WHEN etc.).",
  "Não usar Set Analysis '{<...>}' no script de carga.",
  "Sempre preservar nomes de tabelas/chaves; não dropar campos-chave.",
  "Evitar SELECT * / LOAD *; prefira lista explícita de campos.",
  "Garantir DROP de tabelas temporárias usadas em RESIDENT/geração intermediária."
];

const TASK_TEMPLATES: Record<MegaTaskId, string> = {
  ANALYSIS_AND_PLAN: `TAREFA: ANÁLISE + PLANO (uma única resposta JSON)
- Audite estrutura (tabelas, joins, riscos: chave sintética, referência circular, cartesiano, LOAD *).
- Ache gargalos de performance (JOIN sem chave, RESIDENT em cascata, WHERE ausente).
- Crie plano priorizado (Impacto vs Esforço) com 5-8 passos máximos.
Formato JSON:
{
  "analysis": {
    "structuralScore": number,
    "complexity": "Low"|"Medium"|"High"|"Extreme",
    "bottlenecks": [{ "severity": "Critical"|"High"|"Medium"|"Low", "description": string, "location": string }],
    "dataModelRisks": string[],
    "optimizationOpportunities": string[],
    "analysisSummary": string
  },
  "plan": {
    "strategyName": string,
    "riskLevel": "Low"|"Medium"|"High",
    "planSteps": [{ "step": number, "title": string, "details": string, "targetBottleneck": string, "estimatedEffort": "Low"|"Medium"|"High" }],
    "estimatedImprovement": { "loadTimeReduction": string, "ramUsageReduction": string, "maintainabilityScoreAfter": number }
  }
}`,
  CODE_GEN: `TAREFA: CODE GEN (aplicar plano, preservar lógica)
- Otimize sem mudar regras de negócio.
- Use nomenclatura consistente; alinhar AS; remover SELECT/LOAD *; garantir DROP de temporárias.
- Saída deve ser JSON (texto puro, sem markdown):
{
  "optimizedScript": "SCRIPT_OTIMIZADO_EM_TEXTO_PURO",
  "changesApplied": ["..."],
  "completenessCheck": true
}`,
  FINAL_DELIVERY: `TAREFA: VALIDAÇÃO + DOC FINAL (uma resposta JSON)
- Validar sintaxe e segurança (sem DDL/DML, sem funções não-Qlik).
- Gerar documentação concisa (Mermaid ER), checklist de implantação.
Formato JSON:
{
  "validation": { "isValid": boolean, "issuesFound": string[], "safetyScore": number },
  "documentation": { "title": string, "description": string, "diagramMermaid": string, "reloadStrategy": string },
  "report": { "executiveSummary": string, "technicalDetails": string, "achievedImprovements": string[], "deploymentChecklist": string[] }
}
`
};

export function buildParserSummary(parsed: ParsedScript): string {
  const tableCount = parsed.tables?.length || 0;
  const joinCount = parsed.joins?.length || 0;
  const anti = parsed.antiPatterns?.slice(0, 5).map(a => `${a.type}(${a.severity})@${a.line}`).join("; ") || "-";
  return `Tabelas:${tableCount} Joins:${joinCount} AntiPatterns:${anti}`;
}

function buildNegativeSection(): string {
  return NEGATIVE_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");
}

export function buildMegaPrompt(task: MegaTaskId, script: string, parserSummary: string, history?: string): string {
  const taskTemplate = TASK_TEMPLATES[task];
  const historyBlock = history ? `\n--- HISTÓRICO (Resumo) ---\n${history}\n` : "";

  return `
${PERSONA}

--- GUARDRAILS (NÃO VIOLAR) ---
${buildNegativeSection()}

--- CONTEXTO ESTRUTURADO ---
Parser: ${parserSummary}
${historyBlock}
--- SCRIPT ORIGINAL ---
${script}

--- INSTRUÇÕES DA TAREFA ---
${taskTemplate}

--- FORMATO OBRIGATÓRIO ---
- Responder somente o JSON especificado, texto puro, sem markdown/HTML.
- Manter quebras de linha e indentação do script dentro do campo optimizedScript quando aplicável.
`;
}

export function buildGranularPrompt(step: OptimizationStep, script: string, parserSummary: string): string {
  return `
${PERSONA}

--- GUARDRAILS (NÃO VIOLAR) ---
${buildNegativeSection()}

--- CONTEXTO ESTRUTURADO ---
Etapa: ${step.id} | Nome: ${step.name} | Categoria: ${step.category} | Crítico: ${step.critical}
Descrição: ${step.description}
Parser: ${parserSummary}

--- SCRIPT ORIGINAL ---
${script}

--- INSTRUÇÕES ---
- Aplique SOMENTE a melhoria desta etapa, preservando lógica e resultados.
- Não adicione comentários novos nem markdown.
- Não alterar chaves ou nomes de tabelas a menos que a etapa exija.
- Saída deve ser o script completo otimizado para a etapa (texto puro, sem fences). Se nenhuma mudança, retorne o original.
`;
}
