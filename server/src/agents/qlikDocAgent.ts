import { z } from "zod";

import { logger } from "../lib/logger";
import { defaultOrchestrator } from "../lib/providerOrchestrator";
import type { LLMOptions } from "../types/optimization";

const DocSchema = z.object({
  title: z.string(),
  description: z.string(),
  tables: z.array(z.object({
    name: z.string(),
    description: z.string(),
    fields: z.array(z.string()),
    source: z.string().optional()
  })),
  diagram_mermaid: z.string(),
  reload_strategy: z.string(),
  key_metrics: z.array(z.string())
});

export interface QlikDocResult {
  markdown: string;
  metadata: z.infer<typeof DocSchema>;
}

function buildDocPrompt(script: string): string {
  return `
AINEX QLIK DOCUMENTER — TECHNICAL DOC GENERATOR v1.0
Projeto: QLIK CODEX I.A

PAPEL
Você é um Documentador Técnico Especialista em Qlik.
Sua missão é analisar um script de carga e gerar uma documentação técnica completa e profissional.

SAÍDA ESPERADA (JSON)
{
  "title": "Título Sugerido para o App/Script",
  "description": "Descrição executiva do propósito deste script",
  "tables": [
    {
      "name": "Nome da Tabela",
      "description": "O que esta tabela armazena (Fato, Dimensão, Mapping, etc)",
      "fields": ["Lista", "dos", "principais", "campos"],
      "source": "Fonte de dados (QVD, SQL, Excel)"
    }
  ],
  "diagram_mermaid": "Código Mermaid JS para diagrama ER (erDiagram) das tabelas principais",
  "reload_strategy": "Recomendação de estratégia de recarga (Incremental, Full, Diária)",
  "key_metrics": ["Lista de KPIs ou métricas que parecem ser calculadas neste script"]
}

SCRIPT PARA DOCUMENTAR:
═══════════════════════════════════════════════════════════════════
${script.slice(0, 30000)} 
═══════════════════════════════════════════════════════════════════
`.trim();
}

export async function runQlikDocAgent(
  script: string,
  _llmOptions?: LLMOptions
): Promise<QlikDocResult> {
  const prompt = buildDocPrompt(script);

  try {
    // Use orchestrator for robust execution
    const result = await defaultOrchestrator.executeWithRotation(
      "result_111_create_documentation",
      prompt,
      60000 // 60s timeout
    );

    if (result.fallbackTriggered || !result.result) {
      throw new Error(result.fallbackReason || "Failed to generate documentation");
    }

    const text = result.result;
    const parsed = JSON.parse(text);
    const data = DocSchema.parse(parsed);

    const markdown = `
# ${data.title}

## 📋 Visão Geral
${data.description}

## 🏗️ Modelo de Dados (Mermaid)
\`\`\`mermaid
${data.diagram_mermaid}
\`\`\`

## 📊 Tabelas e Estrutura

${data.tables.map(t => `### 🔹 ${t.name}
*${t.description}*
- **Fonte:** ${t.source || 'N/A'}
- **Campos Chave:** ${t.fields.slice(0, 5).join(', ')}${t.fields.length > 5 ? '...' : ''}
`).join('\n')}

## 🔄 Estratégia de Recarga
${data.reload_strategy}

## 📈 Métricas Identificadas
${data.key_metrics.map(m => `- ${m}`).join('\n')}

---
*Documentação gerada automaticamente por AINEX Qlik Codex I.A*
`.trim();

    return {
      markdown,
      metadata: data
    };

  } catch (error) {
    logger.error("Error in QlikDocAgent", { error });
    throw error;
  }
}
