/**
 * 🚀 QLIK SCRIPT FORMATTER — Ferramenta Gratuita
 * 
 * Estratégia: LLM faz 100% da formatação
 * Sem lógica hardcoded, sem fallback complexo
 * Prompt inteligente + Modelo = Formatação profissional
 */

import { logger } from "../lib/logger";
import { defaultOrchestrator } from "../lib/providerOrchestrator";

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
7.  **Alinhamento Vertical de 'AS':** Alinhe verticalmente a palavra-chave 'AS' dentro de cada bloco LOAD, baseando-se no campo mais longo do bloco.
8.  **NUNCA Altere a Lógica:** O script formatado deve ser funcionalmente idêntico ao original. Não adicione, remova ou altere nomes de campos, valores ou a lógica de negócio.

EXEMPLO DE FORMATAÇÃO:
INPUT:
Tabela1:
LOAD campo1 as ID, campo2 as Nome, if(len(trim(campo3))>0,campo3,'VAZIO') as Descricao, campo4 FROM [lib://Source/Data.qvd] (qvd) WHERE campo1 > 100;

OUTPUT:
Tabela1:
LOAD
    campo1                                         AS ID,
    campo2                                         AS Nome,
    IF(LEN(TRIM(campo3)) > 0, campo3, 'VAZIO')     AS Descricao,
    campo4
FROM
    [lib://Source/Data.qvd] (qvd)
WHERE
    campo1 > 100;

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

    // Usando orquestrador para respeitar rotação/timeout
    const response = await defaultOrchestrator.executeWithRotation(
      // We don't have a dedicated 'formatter' step id so reuse a quality step that reflects formatting
      "quality_067_indentation_fix",
      prompt,
      60000 // 60s
    );

    if (response.fallbackTriggered || !response.result) {
      throw new Error(response.fallbackReason || "LLM retornou vazio");
    }

    const text = response.result;

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
