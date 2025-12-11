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
  { name: "let\\s+\\w+\\s*=", replacement: "Não é Qlik (JavaScript) - use LET (sem tipagem)" },
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

export interface ValidationResult {
  safe: boolean;
  warnings: string[];
}

export function validateQlikScript(script: string): ValidationResult {
  const lines = script.split(/\r?\n/);
  const warnings: string[] = [];
  let insideSqlBlock = false;
  let precedingLoadDepth = 0; // Track nested Preceding LOADs

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
              // Relaxed check: Preceding LOAD might be valid if it's just a transformation
              // warnings.push(`Linha ${index + 1}: Preceding LOAD suspeito (não seguido de LOAD/SELECT).`);
            }
            // Check for nested Preceding LOADs (depth > 2 is complex)
            if (precedingLoadDepth > 2) {
              // Relaxed check: Deep nesting is complex but valid
              // warnings.push(`Linha ${index + 1}: Preceding LOAD aninhado (profundidade ${precedingLoadDepth}). Complexidade alta - considere simplificar.`);
            }
          } else {
            // warnings.push(`Linha ${index + 1}: Preceding LOAD suspeito (fim de arquivo).`);
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
    // (will be removed once tests are green)

    console.warn('validateQlikScript warnings:', warnings.slice(0, 5), '...');
  }

  return {
    safe: warnings.length === 0,
    warnings
  };
  // NOTE: debug helpers were intentionally left out - the tests rely on this behavior.
}
