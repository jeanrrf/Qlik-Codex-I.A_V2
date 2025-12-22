/**
 * AINEX Prompt Components - Code Examples
 * 
 * Reusable code examples showing correct vs incorrect patterns.
 * Used to teach the LLM what NOT to do.
 * 
 * @module prompts/components/examples
 */

export interface CodeExample {
  id: string;
  category: 'error' | 'warning' | 'success';
  title: string;
  wrong: string;
  correct: string;
  explanation: string;
}

export const CODE_EXAMPLES: Record<string, CodeExample> = {
  INCOMPLETE_LOAD: {
    id: 'incomplete-load',
    category: 'error',
    title: 'Missing LOAD keyword',
    wrong: `    C7_FILIAL,
    C7_NUM,
    C7_PRODUTO AS CodProduto
FROM SC7010;`,
    correct: `LOAD
    C7_FILIAL,
    C7_NUM,
    C7_PRODUTO AS CodProduto
FROM
    SC7010;`,
    explanation: 'Missing LOAD keyword - code is incomplete'
  },

  INCOMPLETE_SQL: {
    id: 'incomplete-sql',
    category: 'error',
    title: 'Missing SQL SELECT',
    wrong: `    B1_COD    AS CodProduto,
    B1_DESC   AS DescProduto
FROM SB1010;`,
    correct: `SQL SELECT
    B1_COD    AS CodProduto,
    B1_DESC   AS DescProduto
FROM
    SB1010;`,
    explanation: 'Missing SQL SELECT keyword'
  },

  BARE_FIELD_LIST: {
    id: 'bare-field-list',
    category: 'error',
    title: 'Bare field list without keyword',
    wrong: `C7_FILIAL,
C7_NUM,
C7_PRODUTO AS CodProduto
FROM SC7010;`,
    correct: `LOAD
    C7_FILIAL,
    C7_NUM,
    C7_PRODUTO AS CodProduto
FROM
    SC7010;`,
    explanation: 'NEVER start a script with a bare field list - always include LOAD/SQL SELECT first'
  }
} as const;

export type ExampleId = keyof typeof CODE_EXAMPLES;

/**
 * Format an example for inclusion in a prompt
 */
export function formatExample(example: CodeExample): string {
  const icon = example.category === 'error' ? '❌' :
    example.category === 'warning' ? '⚠️' : '✅';

  return `${icon} WRONG (${example.title}):
${example.wrong}

✅ CORRECT:
${example.correct}`;
}

/**
 * Format multiple examples as a section
 */
export function formatExamplesSection(exampleIds: ExampleId[]): string {
  if (exampleIds.length === 0) return '';

  const examples = exampleIds
    .map(id => CODE_EXAMPLES[id])
    .filter(Boolean)
    .map(formatExample)
    .join('\n\n');

  return `**COMMON MISTAKES TO AVOID:**\n\n${examples}`;
}
