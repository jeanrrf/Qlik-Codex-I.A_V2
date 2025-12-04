import { action } from "./_generated/server";
import { v } from "convex/values";
import { callGemini } from "./lib/llm";

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

export const generateDocumentation = action({
  args: { script: v.string() },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const prompt = buildDocPrompt(args.script);
    const responseText = await callGemini(prompt, apiKey);

    try {
      const data = JSON.parse(responseText);

      // Generate Markdown
      const markdown = `
# ${data.title}

## 📋 Visão Geral
${data.description}

## 🏗️ Modelo de Dados (Mermaid)
\`\`\`mermaid
${data.diagram_mermaid}
\`\`\`

## 📊 Tabelas e Estrutura

${data.tables.map((t: any) => `### 🔹 ${t.name}
*${t.description}*
- **Fonte:** ${t.source || 'N/A'}
- **Campos Chave:** ${t.fields.slice(0, 5).join(', ')}${t.fields.length > 5 ? '...' : ''}
`).join('\n')}

## 🔄 Estratégia de Recarga
${data.reload_strategy}
`;

      return {
        markdown,
        metadata: data
      };
    } catch (e) {
      console.error("Failed to parse documentation response", e);
      throw new Error("Failed to generate documentation: Invalid JSON response");
    }
  },
});
