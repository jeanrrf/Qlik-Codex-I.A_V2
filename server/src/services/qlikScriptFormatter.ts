/**
 * 🚀 QLIK SCRIPT FORMATTER — Ferramenta Gratuita
 * 
 * Estratégia: LLM faz 100% da formatação
 * Sem lógica hardcoded, sem fallback complexo
 * Prompt inteligente + Modelo = Formatação profissional
 */

import { generateStructuredJson } from "../lib/llmClient";
import { logger } from "../lib/logger";
import { config } from "../lib/config";

export interface FormatterResult {
  formattedScript: string;
  notes: string[];
  provider: "llm";
}

/**
 * Prompt direto e eficaz - LLM faz o trabalho pesado
 */
function buildPrompt(script: string): string {
  return `Você é um formatador de código expert em Qlik Script (Qlik Sense e QlikView).

OBJETIVO: Formatar o script Qlik fornecido, aplicando as melhores práticas de mercado para clareza e manutenibilidade, sem alterar a lógica.

REGRAS DE FORMATAÇÃO:
1.  **Keywords Qlik em Maiúsculas:** Todos os comandos e funções Qlik devem ser em UPPERCASE (ex: LOAD, IF, RESIDENT, JOIN, UPPER, DATE).
2.  **Indentação:** Use 4 espaços para indentar blocos de código, como statements LOAD, loops e condições IF.
3.  **Um Campo por Linha:** Em statements LOAD, liste cada campo em uma nova linha, com indentação.
4.  **Estrutura de LOADs:** A palavra-chave 'FROM' ou 'RESIDENT' deve vir após a lista de campos.
5.  **JOINs e Concatenates:** Prefixos como 'LEFT JOIN' ou 'CONCATENATE' devem vir antes do 'LOAD' ao qual se aplicam e devem estar no mesmo nível de indentação do primeiro LOAD.
6.  **Funções Aninhadas:** Formate funções aninhadas de forma legível, quebrando-as em várias linhas se forem complexas.
7.  **NUNCA Altere a Lógica:** O script formatado deve ser funcionalmente idêntico ao original. Não adicione, remova ou altere nomes de campos, valores ou a lógica de negócio.

EXEMPLO DE FORMATAÇÃO:
INPUT:
Tabela1:
LOAD campo1, campo2, if(len(trim(campo3))>0,campo3,'VAZIO') as campo3, campo4 FROM [lib://Source/Data.qvd] (qvd) WHERE campo1 > 100;
LEFT JOIN(Tabela1) LOAD campo1, campo5 RESIDENT Tabela2;

OUTPUT:
Tabela1:
LOAD
    campo1,
    campo2,
    If(
        Len(Trim(campo3)) > 0,
        campo3,
        'VAZIO'
    ) AS campo3,
    campo4
FROM
    [lib://Source/Data.qvd] (qvd)
WHERE
    campo1 > 100;

LEFT JOIN (Tabela1)
LOAD
    campo1,
    campo5
RESIDENT
    Tabela2;

Responda em formato JSON, contendo o script formatado e notas sobre as alterações.
{"formattedScript": "...", "notes": ["..."]}

SCRIPT PARA FORMATAR:
${script}`;
}

/**
 * Formatador principal - 100% baseado em LLM
 */
export async function formatQlikScript(script: string): Promise<FormatterResult> {
  try {
    const prompt = buildPrompt(script.trim());

    // Usando modelo configurado (default: gemini-2.5-flash)
    const { text } = await generateStructuredJson(prompt, {
      provider: "google",
      model: config.geminiModel,
      maxOutputTokens: config.geminiExtendedMaxOutputTokens,
      taskType: "formatting"
    });

    if (!text) throw new Error("LLM retornou vazio");

    // Limpeza robusta de Markdown antes do parse
    const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();

    let parsed: { formattedScript?: string; notes?: string[] };
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      // Tenta extrair JSON se houver texto antes/depois
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw e;
      }
    }

    if (!parsed.formattedScript) throw new Error("Resposta sem formattedScript");

    return {
      formattedScript: parsed.formattedScript.trim(),
      notes: parsed.notes || ["Formatado com sucesso"],
      provider: "llm"
    };
  } catch (error) {
    logger.error("Formatter falhou", { error });

    // Fallback minimalista: retorna original
    return {
      formattedScript: script.trim(),
      notes: ["Erro na formatação. Script original retornado."],
      provider: "llm"
    };
  }
}
