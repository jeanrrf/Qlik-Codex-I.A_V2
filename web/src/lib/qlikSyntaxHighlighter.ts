/**
 * Qlik Syntax Highlighter
 * Aplica syntax highlighting colorido para código Qlik Script
 */

export interface Token {
  type: 'keyword' | 'function' | 'operator' | 'string' | 'comment' | 'number' | 'identifier' | 'whitespace';
  value: string;
}

// Palavras-chave Qlik
const KEYWORDS = new Set([
  'LOAD', 'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC',
  'LEFT', 'RIGHT', 'INNER', 'OUTER', 'JOIN', 'KEEP', 'CONCATENATE',
  'IF', 'THEN', 'ELSE', 'ELSEIF', 'ENDIF', 'END', 'SWITCH', 'CASE', 'DEFAULT', 'ENDSWITCH',
  'FOR', 'EACH', 'TO', 'STEP', 'DO', 'LOOP', 'NEXT', 'EXIT', 'WHILE', 'UNTIL',
  'SUB', 'ENDSUB', 'CALL',
  'LET', 'SET', 'UNQUALIFY', 'QUALIFY', 'RENAME', 'DROP', 'FIELDS', 'FIELD', 'TABLE', 'TABLES',
  'RESIDENT', 'INLINE', 'AUTOGENERATE', 'BUNDLE', 'INFO', 'CROSSTABLE',
  'MAPPING', 'APPLYMAP', 'FIRST', 'LAST', 'PRECEDING', 'FOLLOWING',
  'SQL', 'OLEDB', 'ODBC', 'CUSTOM', 'CONNECT', 'DISCONNECT',
  'STORE', 'QVD', 'TXT', 'XML', 'BINARY', 'NULLASVALUE', 'NULLASNULL',
  'AS', 'ALIAS', 'TAG', 'COMMENT', 'TRACE', 'EXECUTE', 'SLEEP',
  'AND', 'OR', 'NOT', 'XOR', 'IN', 'LIKE', 'IS', 'NULL',
  'PEEK', 'PREVIOUS', 'INTERRECORDNUMBER', 'RECNO', 'FIELDVALUE', 'FIELDINDEX',
  'QUALIFY', 'UNQUALIFY', 'SECTION', 'ACCESS', 'APPLICATION'
]);

// Funções Qlik comuns
const FUNCTIONS = new Set([
  'Date', 'Timestamp', 'Time', 'Num', 'Text', 'Dual', 'Money',
  'Year', 'Month', 'Day', 'Hour', 'Minute', 'Second', 'WeekDay', 'Week',
  'Today', 'Now', 'MakeDate', 'MakeTime', 'MonthStart', 'MonthEnd', 'YearStart', 'YearEnd',
  'AddMonths', 'AddYears', 'NetworkDays', 'InYear', 'InMonth',
  'Left', 'Right', 'Mid', 'Len', 'Upper', 'Lower', 'Trim', 'LTrim', 'RTrim',
  'Replace', 'SubField', 'Index', 'TextBetween', 'PurgeChar', 'KeepChar',
  'Sum', 'Count', 'Avg', 'Min', 'Max', 'Only', 'FirstSortedValue', 'Concat',
  'RangeSum', 'RangeCount', 'RangeAvg', 'RangeMin', 'RangeMax',
  'If', 'Alt', 'Match', 'MixMatch', 'WildMatch', 'Pick', 'Class', 'Interval',
  'Exists', 'Lookup', 'ApplyMap', 'MapSubString',
  'Fabs', 'Floor', 'Ceil', 'Round', 'Mod', 'Div', 'Frac', 'Sign',
  'Sqrt', 'Pow', 'Exp', 'Log', 'Log10', 'Rand', 'Randseed',
  'Sin', 'Cos', 'Tan', 'Asin', 'Acos', 'Atan', 'Atan2',
  'RGB', 'HSL', 'Color', 'Colormix1', 'Colormix2',
  'AutoNumber', 'AutoNumberHash128', 'AutoNumberHash256',
  'FieldValue', 'FieldValueCount', 'FieldIndex',
  'Aggr', 'TOTAL', 'Distinct', 'SetExpression'
]);

// Operadores
const OPERATORS = new Set([
  '+', '-', '*', '/', '=', '<>', '>', '<', '>=', '<=', '&', '(', ')', ',', ';', '[', ']', '{', '}'
]);

export function tokenizeQlikScript(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    const char = code[i];

    // Comentários de linha (//)
    if (char === '/' && code[i + 1] === '/') {
      let comment = '';
      while (i < code.length && code[i] !== '\n') {
        comment += code[i];
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Comentários de bloco (/* */)
    if (char === '/' && code[i + 1] === '*') {
      let comment = '';
      while (i < code.length) {
        comment += code[i];
        if (code[i] === '*' && code[i + 1] === '/') {
          comment += code[i + 1];
          i += 2;
          break;
        }
        i++;
      }
      tokens.push({ type: 'comment', value: comment });
      continue;
    }

    // Strings entre aspas simples
    if (char === "'") {
      let str = "'";
      i++;
      while (i < code.length && code[i] !== "'") {
        str += code[i];
        i++;
      }
      if (i < code.length) {
        str += "'";
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Strings entre aspas duplas
    if (char === '"') {
      let str = '"';
      i++;
      while (i < code.length && code[i] !== '"') {
        str += code[i];
        i++;
      }
      if (i < code.length) {
        str += '"';
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Campos entre colchetes [Field]
    if (char === '[') {
      let field = '[';
      i++;
      while (i < code.length && code[i] !== ']') {
        field += code[i];
        i++;
      }
      if (i < code.length) {
        field += ']';
        i++;
      }
      tokens.push({ type: 'identifier', value: field });
      continue;
    }

    // Números
    if (/\d/.test(char)) {
      let num = '';
      while (i < code.length && /[\d.]/.test(code[i])) {
        num += code[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Espaços em branco
    if (/\s/.test(char)) {
      let ws = '';
      while (i < code.length && /\s/.test(code[i])) {
        ws += code[i];
        i++;
      }
      tokens.push({ type: 'whitespace', value: ws });
      continue;
    }

    // Operadores
    if (OPERATORS.has(char)) {
      // Verifica operadores de dois caracteres
      const twoChar = char + (code[i + 1] || '');
      if (OPERATORS.has(twoChar)) {
        tokens.push({ type: 'operator', value: twoChar });
        i += 2;
      } else {
        tokens.push({ type: 'operator', value: char });
        i++;
      }
      continue;
    }

    // Identificadores e palavras-chave
    if (/[a-zA-Z_$]/.test(char)) {
      let word = '';
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
        word += code[i];
        i++;
      }

      const upperWord = word.toUpperCase();
      if (KEYWORDS.has(upperWord)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (FUNCTIONS.has(word)) {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'identifier', value: word });
      }
      continue;
    }

    // Caractere desconhecido
    tokens.push({ type: 'identifier', value: char });
    i++;
  }

  return tokens;
}

export function tokensToHtml(tokens: Token[]): string {
  return tokens
    .map(token => {
      const escaped = token.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      switch (token.type) {
        case 'keyword':
          return `<span class="syntax-keyword">${escaped}</span>`;
        case 'function':
          return `<span class="syntax-function">${escaped}</span>`;
        case 'operator':
          return `<span class="syntax-operator">${escaped}</span>`;
        case 'string':
          return `<span class="syntax-string">${escaped}</span>`;
        case 'comment':
          return `<span class="syntax-comment">${escaped}</span>`;
        case 'number':
          return `<span class="syntax-number">${escaped}</span>`;
        case 'identifier':
          return escaped; // Identificadores sem classe especial
        case 'whitespace':
          return escaped;
        default:
          return escaped;
      }
    })
    .join('');
}

export function highlightQlikCode(code: string): string {
  // Ensure we are working with plain text.
  // We strip HTML tags using a smart regex that preserves code like "WHERE Value < 10".
  // It only removes tags that start with a letter (e.g. <span, <div, </span).

  const cleanCode = code
    // First pass: strip HTML tags like <span class="...">text</span>
    .replace(/<\/?\s*[a-zA-Z][^>]*>/g, '')
    // Second pass: handle incomplete/broken tags from LLM hallucinations
    .replace(/<span\s+[^>]*$/gm, '')  // Remove incomplete opening tags at line end
    .replace(/^\s*<\/span>/gm, '')    // Remove orphan closing tags at line start
    // Decode HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up any remaining malformed patterns
    .replace(/class="[^"]*"/g, '')  // Remove orphan class attributes
    .replace(/<\/?>/g, '');         // Remove empty tags

  const tokens = tokenizeQlikScript(cleanCode);
  return tokensToHtml(tokens);
}