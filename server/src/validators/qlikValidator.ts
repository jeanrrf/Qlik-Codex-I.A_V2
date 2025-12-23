import { logger } from "../lib/logger";

const PROHIBITED_SQL = [
  "CREATE",
  "ALTER",
  "INSERT",
  "UPDATE",
  "DELETE",
  "WITH",
  "DECLARE",
  "BEGIN",
  "END",
  "FUNCTION",
  "PROCEDURE"
];

// ⚠️ LEGACY: Funções alucinadas - mantido por retrocompatibilidade
// Considerar remover em v3.0 se não houver mais falsos positivos
const HALLUCINATED_FUNCTIONS = [
  { name: "CASE WHEN", replacement: "If() ou Pick(Match())" },
  { name: "DATEDIFF", replacement: "subtração direta ou Interval()" },
  { name: "GETDATE", replacement: "Today() ou Now()" },
  { name: "NVL", replacement: "Alt() ou Coalesce()" },
  { name: "SUBSTRING", replacement: "Mid()" },
  { name: "CHARINDEX", replacement: "Index()" },
  { name: "CAST", replacement: "Text(), Num() ou Date()" },
  { name: "CONVERT", replacement: "Text(), Num() ou Date()" },
  { name: "ISNULL", replacement: "Alt() ou Coalesce()" },
  { name: "COALESCE", replacement: "Alt() ou Coalesce() - OK em Qlik, mas prefira Alt()" },
  // { name: "LEFT\\(", replacement: "Left() - OK, mas certifique-se de usar sintaxe Qlik" },
  // { name: "RIGHT\\(", replacement: "Right() - OK, mas certifique-se de usar sintaxe Qlik" },
  // { name: "LEN\\(", replacement: "Len() - função Qlik correta" },
  // { name: "TRIM\\(", replacement: "Trim() - função Qlik correta" },
  // { name: "UPPER\\(", replacement: "Upper() - função Qlik correta" },
  // { name: "LOWER\\(", replacement: "Lower() - função Qlik correta" },
  // { name: "CONCAT\\(", replacement: "& (operador de concatenação) ou Concat() em agregação" },
  // { name: "FLOOR\\(", replacement: "Floor() - função Qlik correta" },
  // { name: "CEIL\\(", replacement: "Ceil() - função Qlik correta" },
  // { name: "ROUND\\(", replacement: "Round() - função Qlik correta" },
  { name: "TO_DATE", replacement: "Date#() para parsing ou Date() para formatação" },
  { name: "TO_CHAR", replacement: "Text() ou formatação com Date(), Num(), Time()" },
  { name: "STR_TO_DATE", replacement: "Date#() com máscara de formato" },
  { name: "DATEADD", replacement: "Operadores +/- com intervalos (ex: Date + 7)" },
  { name: "NULLIF", replacement: "If(campo1 = campo2, null(), campo1)" },
  { name: "IFNULL", replacement: "Alt() ou Coalesce()" },
  { name: "DECODE", replacement: "Pick(Match()) ou mapeamento ApplyMap()" }
];

// Funções JavaScript/Python que não existem em Qlik
const NON_QLIK_FUNCTIONS = [
  { name: "\\.map\\(", replacement: "Não é Qlik - use transformações no LOAD ou ApplyMap()" },
  { name: "\\.filter\\(", replacement: "Não é Qlik - use cláusula WHERE" },
  { name: "\\.reduce\\(", replacement: "Não é Qlik - use agregações (Sum, Concat, etc)" },
  { name: "\\.forEach\\(", replacement: "Não é Qlik - use loop FOR...NEXT" },
  { name: "console\\.log", replacement: "Não é Qlik - use TRACE para debug" },
  { name: "print\\(", replacement: "Não é Qlik (Python) - use TRACE para debug" },
  { name: "def\\s+\\w+\\(", replacement: "Não é Qlik (Python) - use SUB...END SUB" },
  { name: "function\\s+\\w+\\(", replacement: "Não é Qlik (JavaScript) - use SUB...END SUB" },
  { name: "const\\s+\\w+\\s*=", replacement: "Não é Qlik (JavaScript) - use LET ou SET" },
  { name: "var\\s+\\w+\\s*=", replacement: "Não é Qlik (JavaScript) - use LET ou SET" },
  { name: "import\\s+", replacement: "Não é Qlik (JS/Python) - não há imports, apenas LOAD/CALL" },
  { name: "require\\(", replacement: "Não é Qlik (Node.js) - não suportado" },
  { name: "lambda\\s+", replacement: "Não é Qlik (Python) - use expressões inline ou SUB" }
];

const SQL_START_REGEX = /^SQL\b/i;
const SET_ANALYSIS_REGEX = /\{<.*>\}/;

function isComment(line: string): boolean {
  return /^\s*(\/\/|REM\b|\/\*)/i.test(line);
}

/**
 * Detecta código incompleto: campos sem LOAD/SELECT keywords
 * Esse é um dos bugs mais comuns quando LLMs geram código Qlik
 * 
 * MELHORADO: Reduz falsos positivos verificando contexto completo
 */
function detectIncompleteStatements(script: string): string[] {
  const lines = script.split(/\r?\n/);
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || isComment(line)) continue;

    // Detecta linhas que parecem ser listas de campos sem LOAD/SELECT
    // Padrão: "    CampoA," ou "    CampoA AS Alias," sem LOAD antes
    // IMPORTANTE: Só detecta se tiver vírgula OU múltiplas linhas de campos (indentados)

    // Verifica se é uma linha de campo suspeita (indentada com vírgula ou AS)
    const isFieldLine = /^\s{2,}[\w[\]]+.*,\s*$/i.test(line) || /^\s{2,}[\w[\]]+\s+AS\s+[\w[\]]+,?\s*$/i.test(line);

    if (isFieldLine) {
      // Verificar se há LOAD/SELECT nas linhas anteriores (procura mais longe)
      let hasKeyword = false;
      const lookBackStart = Math.max(0, i - 10); // Aumentado de 5 para 10 linhas

      for (let j = i - 1; j >= lookBackStart; j--) {
        const prevLine = lines[j].trim();
        if (!prevLine || isComment(prevLine)) continue;

        // Se encontrou LOAD ou SELECT, é válido
        if (/^(LOAD|SQL\s+SELECT|SELECT)\b/i.test(prevLine)) {
          hasKeyword = true;
          break;
        }

        // Se encontrou outra declaração estrutural, parar de procurar
        if (/^(DROP\s+TABLE|LET|SET|STORE|SUB|FOR|NEXT|CALL)\b/i.test(prevLine)) {
          break;
        }
      }

      // Só reporta erro se realmente não encontrou keyword E tem FROM próximo
      if (!hasKeyword) {
        // Verificar se FROM está próximo (indicando lista de campos órfã)
        const nextLines = lines.slice(i, Math.min(i + 15, lines.length)).join('\n');
        if (/\bFROM\b/i.test(nextLines) && !/^LOAD\b/i.test(nextLines) && !/^SELECT\b/i.test(nextLines)) {
          errors.push(`Linha ${i + 1}: CRÍTICO - Lista de campos sem palavra-chave LOAD ou SELECT. Código incompleto detectado: "${line.substring(0, 60)}${line.length > 60 ? '...' : ''}"`);
        }
      }
    }

    // Detecta FROM sem LOAD/SELECT antes (indicador mais forte de código incompleto)
    if (/^\s*FROM\b/i.test(line) && !/:$/.test(lines[Math.max(0, i - 1)]?.trim() || '')) {
      // Verificar se há LOAD/SELECT nas 30 linhas anteriores (pode ter muitos campos)
      let hasLoadOrSelect = false;
      const lookBackStart = Math.max(0, i - 30); // Aumentado de 20 para 30

      for (let j = i - 1; j >= lookBackStart; j--) {
        const prevLine = lines[j].trim();
        if (!prevLine || isComment(prevLine)) continue;

        if (/^(LOAD|SQL\s+SELECT|SELECT)\b/i.test(prevLine)) {
          hasLoadOrSelect = true;
          break;
        }

        // Se encontrou outra declaração estrutural, parar
        if (/^(DROP\s+TABLE|LET|SET|STORE|SUB|FOR|NEXT|CALL)\b/i.test(prevLine)) {
          break;
        }

        // Se encontrou TRACE, continuar procurando (pode ter TRACE entre LOAD e FROM)
        if (/^TRACE\b/i.test(prevLine)) {
          continue;
        }
      }

      if (!hasLoadOrSelect) {
        errors.push(`Linha ${i + 1}: CRÍTICO - FROM encontrado sem LOAD ou SELECT correspondente. Código incompleto gerado pelo LLM.`);
      }
    }
  }

  return errors;
}

function detectUnbalancedParentheses(script: string): string[] {
  const errors: string[] = [];
  const lines = script.split(/\r?\n/);
  let balance = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || isComment(trimmed)) {
      continue;
    }

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      const next = line[j + 1];

      if (ch === "'" && !inDouble) {
        if (inSingle && next === "'") {
          j++;
          continue;
        }
        inSingle = !inSingle;
        continue;
      }

      if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
        continue;
      }

      if (inSingle || inDouble) {
        continue;
      }

      if (ch === '(') {
        balance++;
      } else if (ch === ')') {
        balance--;
        if (balance < 0) {
          errors.push(`Linha ${i + 1}: CRITICO - Parenteses fechando sem abertura correspondente.`);
          balance = 0;
        }
      }
    }
  }

  if (balance > 0) {
    errors.push(`CRITICO - Parenteses abertos sem fechamento detectados (saldo ${balance}).`);
  }

  return errors;
}

export interface ValidationResult {
  safe: boolean;
  warnings: string[];
}

export function validateQlikScript(script: string): ValidationResult {
  const lines = script.split(/\r?\n/);
  const warnings: string[] = [];
  let insideSqlBlock = false;
  let precedingLoadDepth = 0; // Track nested Preceding LOADs

  // CRITICAL: Check for incomplete statements first (most common LLM bug)
  const incompleteErrors = detectIncompleteStatements(script);
  if (incompleteErrors.length > 0) {
    warnings.push(...incompleteErrors);
  }

  const parenthesesErrors = detectUnbalancedParentheses(script);
  if (parenthesesErrors.length > 0) {
    warnings.push(...parenthesesErrors);
  }

  const getNextCodeLineIndex = (start: number): number => {
    for (let i = start + 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l && !isComment(l)) return i;
    }
    return -1;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    // Handle SQL block state even on empty/comment lines if they contain semicolon
    // If we're inside a SQL block and this line closes it (contains ;),
    // treat this closing line as still part of the SQL block and skip further checks.
    if (insideSqlBlock && line.includes(";")) {
      insideSqlBlock = false;
      return; // skip processing this line (it's part of the SQL block)
    }

    if (!line || isComment(line)) {
      return;
    }

    if (!insideSqlBlock && SQL_START_REGEX.test(line)) {
      insideSqlBlock = !line.includes(";");
      return;
    }

    if (insideSqlBlock) {
      return;
    }

    // Check for Set Analysis (Hallucination in Script)
    if (SET_ANALYSIS_REGEX.test(line)) {
      warnings.push(`Linha ${index + 1}: Set Analysis '{<...>}' detectado. Isso geralmente é inválido em Script de Carga (exceto em casos raros de Aggr). Verifique se não é uma alucinação.`);
    }

    // Check for Hallucinated SQL Functions
    for (const func of HALLUCINATED_FUNCTIONS) {
      const regex = new RegExp(`\\b${func.name}\\b`, "i");
      if (regex.test(line)) {
        warnings.push(`Linha ${index + 1}: Função suspeita '${func.name}' detectada. Em Qlik, use ${func.replacement}.`);
      }
    }

    // Check for Non-Qlik Language Constructs (JavaScript/Python/etc)
    for (const construct of NON_QLIK_FUNCTIONS) {
      const regex = new RegExp(construct.name, "i");
      if (regex.test(line)) {
        warnings.push(`Linha ${index + 1}: CONFUSÃO DE LINGUAGEM detectada! '${construct.name.replace(/\\/g, '')}' não é sintaxe Qlik. ${construct.replacement}`);
      }
    }

    // Check for Aggregation without GROUP BY (outside SQL blocks)
    const aggFunctionRegex = /\b(Sum|Count|Avg|Min|Max|First|Last|Only)\s*\(/i;
    if (aggFunctionRegex.test(line) && !/\bGROUP\s+BY\b/i.test(line)) {
      // Check if it's part of a multi-line statement with GROUP BY
      let hasGroupBy = false;
      for (let j = index; j < Math.min(index + 5, lines.length); j++) {
        if (/\bGROUP\s+BY\b/i.test(lines[j])) {
          hasGroupBy = true;
          break;
        }
        // Stop at next statement
        if (j > index && /^(LOAD|SQL|SELECT|DROP|LET|SET|STORE)\b/i.test(lines[j].trim())) {
          break;
        }
      }
      if (!hasGroupBy) {
        // Relaxed check: Single record aggregation is valid in Qlik (e.g. for KPI tables)
        // warnings.push(`Linha ${index + 1}: Função de agregação (${line.match(aggFunctionRegex)?.[0]}) sem GROUP BY detectada. Isso gera 1 único registro agregado. Se intencional (KPI único), OK. Caso contrário, adicione GROUP BY ou mova para frontend.`);
      }
    }

    // Check 1: Preceding LOAD (Enhanced with depth tracking)
    // If LOAD appears without FROM/RESIDENT/AUTOGENERATE/INLINE/EXTENSION
    // It implies it is a Preceding LOAD and must be followed by another LOAD or SELECT
    if (/^LOAD\b/i.test(line)) {
      // Check if FROM/RESIDENT etc is on the same line
      const hasSource = /\b(FROM|RESIDENT|AUTOGENERATE|INLINE|EXTENSION)\b/i.test(line);

      if (!hasSource) {
        // Check next few lines for FROM (multi-line LOAD)
        let foundSource = false;
        for (let j = index + 1; j < Math.min(index + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (!nextLine || isComment(nextLine)) continue;

          // If we find FROM, it's a normal LOAD
          if (/\b(FROM|RESIDENT|AUTOGENERATE|INLINE|EXTENSION)\b/i.test(nextLine)) {
            foundSource = true;
            break;
          }

          // If we find another statement keyword, stop looking
          if (/^(LOAD|SQL|SELECT|DROP|LET|SET|STORE)\b/i.test(nextLine)) {
            break;
          }
        }

        // If no source found, it's a Preceding LOAD
        if (!foundSource) {
          precedingLoadDepth++;
          const nextIdx = getNextCodeLineIndex(index);
          if (nextIdx !== -1) {
            const nextLine = lines[nextIdx].trim();
            // Allow LOAD, SQL SELECT, SELECT
            if (!/^(LOAD|SQL|SELECT)\b/i.test(nextLine)) {
              warnings.push(`Linha ${index + 1}: Preceding LOAD suspeito (não seguido de LOAD/SELECT).`);
            }
            // Check for nested Preceding LOADs (depth > 2 is complex)
            if (precedingLoadDepth > 2) {
              warnings.push(`Linha ${index + 1}: Preceding LOAD aninhado (profundidade ${precedingLoadDepth}). Complexidade alta - considere simplificar.`);
            }
          } else {
            warnings.push(`Linha ${index + 1}: Preceding LOAD suspeito (fim de arquivo).`);
          }
        } else {
          precedingLoadDepth = 0; // Reset on source found
        }
      } else {
        precedingLoadDepth = 0; // Reset on normal LOAD
      }
    }

    // Check 2: NOCONCATENATE usage
    if (/^NOCONCATENATE\b/i.test(line)) {
      const nextIdx = getNextCodeLineIndex(index);
      if (nextIdx !== -1) {
        const nextLine = lines[nextIdx].trim();
        if (!/^(LOAD|SQL|SELECT)\b/i.test(nextLine)) {
          warnings.push(`Linha ${index + 1}: NOCONCATENATE deve ser seguido por LOAD ou SELECT.`);
        }
      }
    }

    // Check 3: Implicit JOIN (Outer Join warning)
    if (/^JOIN\b/i.test(line) && !/\b(LEFT|INNER|OUTER|RIGHT)\b/i.test(line) && !line.includes("(")) {
      warnings.push(`Linha ${index + 1}: JOIN simples detectado (funciona como Outer Join). Verifique se não deveria ser LEFT/INNER.`);
    }

    // Check 4: QUALIFY * without UNQUALIFY
    if (/\bQUALIFY\s+\*/i.test(line)) {
      // Look ahead for UNQUALIFY in next 5 lines
      let hasUnqualify = false;
      for (let j = index + 1; j < Math.min(index + 10, lines.length); j++) {
        if (/\bUNQUALIFY\b/i.test(lines[j])) {
          hasUnqualify = true;
          break;
        }
        // Stop at next table load
        if (/^(LOAD|SQL|SELECT)\b/i.test(lines[j].trim()) && j > index + 2) {
          break;
        }
      }
      if (!hasUnqualify) {
        warnings.push(`Linha ${index + 1}: QUALIFY * sem UNQUALIFY detectado. Isso prefixa TODOS os campos (incluindo chaves), quebrando associações. Adicione UNQUALIFY para campos de ligação.`);
      }
    }

    // Check 5: RESIDENT without DROP
    if (/\bRESIDENT\s+(\w+)/i.test(line)) {
      const match = line.match(/\bRESIDENT\s+(\w+)/i);
      if (match) {
        const tableName = match[1];
        // Look ahead for DROP TABLE
        let hasDropTable = false;
        for (let j = index + 1; j < Math.min(index + 30, lines.length); j++) {
          if (new RegExp(`\\bDROP\\s+TABLE\\s+${tableName}\\b`, "i").test(lines[j])) {
            hasDropTable = true;
            break;
          }
        }
        // Only warn if the same table appears in multiple RESIDENT loads in the script
        const residentRegex = new RegExp(`\\bRESIDENT\\s+${tableName}\\b`, 'i');
        const allResidentCount = lines.reduce((acc, l) => acc + (residentRegex.test(l) ? 1 : 0), 0);
        if (allResidentCount > 1 && !hasDropTable) {
          warnings.push(`Linha ${index + 1}: RESIDENT LOAD da tabela '${tableName}' sem DROP TABLE detectado. Isso duplica consumo de RAM. Adicione 'DROP TABLE ${tableName};' após o LOAD.`);
        }
      }
    }

    for (const keyword of PROHIBITED_SQL) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(line)) {
        warnings.push(
          `Possivel SQL fora de bloco permitido na linha ${index + 1}: ${keyword}`
        );
        break;
      }
    }
  });

  if (warnings.length > 0) {
    // Debug output to help CI while fixing validator behaviour
    logger.warn('[Validator] Script warnings detected', {
      count: warnings.length,
      sample: warnings.slice(0, 3)
    });
  }

  return {
    safe: warnings.length === 0,
    warnings
  };
  // NOTE: debug helpers were intentionally left out - the tests rely on this behavior.
}
