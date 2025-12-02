/**
 * Script Analyzer - Detecta características do script para otimização de processamento
 * Melhora performance em arquivos QVD/QVS grandes sem perder precisão
 */

export interface ScriptCharacteristics {
  fileType: 'qvd' | 'qvs' | 'txt' | 'unknown';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  complexity: 'low' | 'medium' | 'high' | 'critical';
  hasQVDOperations: boolean;
  qvdReadCount: number;
  qvdWriteCount: number;
  estimatedTokens: number;
  lineCount: number;
}

/**
 * Analisa características do script para determinar melhor estratégia de processamento
 * @param script - Conteúdo do script
 * @param isTruncated - Se true, desabilita chunking (FREE TIER)
 * @param filename - Nome do arquivo (opcional, para detectar tipo)
 */
export function analyzeScriptCharacteristics(
  script: string,
  isTruncated: boolean = false,
  filename?: string
): ScriptCharacteristics {
  const lines = script.split(/\r?\n/);
  const lineCount = lines.length;
  const upperScript = script.toUpperCase();

  // Detecta tipo de arquivo
  let fileType: ScriptCharacteristics['fileType'] = 'unknown';
  if (filename && typeof filename === 'string') {
    if (filename.endsWith('.qvd')) fileType = 'qvd';
    else if (filename.endsWith('.qvs')) fileType = 'qvs';
    else if (filename.endsWith('.txt')) fileType = 'txt';
  }

  // Conta operações QVD
  const qvdReadMatches = upperScript.match(/FROM\s+\[?[^\]]*\.QVD/gi) || [];
  const qvdWriteMatches = upperScript.match(/STORE\s+\w+\s+INTO\s+\[?[^\]]*\.QVD/gi) || [];
  const qvdReadCount = qvdReadMatches.length;
  const qvdWriteCount = qvdWriteMatches.length;
  const hasQVDOperations = qvdReadCount > 0 || qvdWriteCount > 0;

  // Estima tokens (aproximadamente 4 caracteres = 1 token)
  const estimatedTokens = Math.ceil(script.length / 4);

  // Define tamanho
  let size: ScriptCharacteristics['size'];
  if (lineCount < 200) size = 'small';
  else if (lineCount < 500) size = 'medium';
  else if (lineCount < 1000) size = 'large';
  else size = 'xlarge';

  // Calcula complexidade
  const loadCount = (upperScript.match(/\bLOAD\b/g) || []).length;
  const joinCount = (upperScript.match(/\bJOIN\b/g) || []).length;
  const sqlCount = (upperScript.match(/\bSQL\s+SELECT\b/g) || []).length;
  const loopCount = (upperScript.match(/\b(FOR|DO\s+WHILE)\b/g) || []).length;

  const complexityScore = (loadCount * 1) + (joinCount * 2) + (sqlCount * 3) + (loopCount * 4);

  let complexity: ScriptCharacteristics['complexity'];
  if (complexityScore < 20) complexity = 'low';
  else if (complexityScore < 50) complexity = 'medium';
  else if (complexityScore < 100) complexity = 'high';
  else complexity = 'critical';

  return {
    fileType,
    size,
    complexity,
    hasQVDOperations,
    qvdReadCount,
    qvdWriteCount,
    estimatedTokens,
    lineCount
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * FREE TIER: TRUNCAMENTO INTELIGENTE 200+ LINHAS
 * ═══════════════════════════════════════════════════════════════
 */

export interface SmartTruncationResult {
  truncatedScript: string;
  originalLines: number;
  actualLines: number;
  extraLinesAdded: number;
  cutPoint: string;
  warningMessage: string;
  wasTruncated: boolean;
}

/**
 * Corta script em 200 linhas + extras para completar bloco
 * NUNCA corta blocos no meio (LOAD, IF, JOIN, APPLYMAP, GROUP BY, etc.)
 */
export function applySmartTruncation(
  script: string,
  lineLimit: number = 200
): SmartTruncationResult {
  const lines = script.split(/\r?\n/);
  const originalLines = lines.length;

  // Se já está dentro do limite, retorna sem modificação
  if (originalLines <= lineLimit) {
    return {
      truncatedScript: script,
      originalLines,
      actualLines: originalLines,
      extraLinesAdded: 0,
      cutPoint: 'N/A',
      warningMessage: '',
      wasTruncated: false
    };
  }

  let cutLine = lineLimit;
  let extraLines = 0;
  const maxExtraLines = 30; // Máximo de 30 linhas extras

  // Keywords que iniciam blocos Qlik (case-insensitive)
  const blockStartKeywords = [
    /^\\s*LOAD\\b/i,
    /^\\s*IF\\b/i,
    /^\\s*JOIN\\b/i,
    /^\\s*LEFT\\s+JOIN\\b/i,
    /^\\s*INNER\\s+JOIN\\b/i,
    /^\\s*RIGHT\\s+JOIN\\b/i,
    /^\\s*OUTER\\s+JOIN\\b/i,
    /^\\s*APPLYMAP\\b/i,
    /^\\s*GROUP\\s+BY\\b/i,
    /^\\s*AUTOGENERATE\\b/i,
    /^\\s*SUB\\b/i,
    /^\\s*FOR\\b/i,
    /^\\s*DO\\s+WHILE\\b/i,
    /^\\s*SQL\\s+SELECT\\b/i,
    /^\\s*STORE\\b/i
  ];

  // Procura fim seguro do bloco (até maxExtraLines)
  while (cutLine < lines.length && extraLines < maxExtraLines) {
    const currentLine = lines[cutLine].trim();
    const nextLine = lines[cutLine + 1]?.trim() || '';

    // Fim de bloco: ponto-e-vírgula ou linha vazia seguida de novo bloco
    const isBlockEnd = currentLine.endsWith(';');
    const nextIsNewBlock = blockStartKeywords.some(regex => regex.test(nextLine));
    const currentIsEmpty = currentLine === '';
    const nextIsEmpty = nextLine === '';

    // Condições para parar:
    // 1. Linha termina com ; e próxima é novo bloco
    // 2. Linha termina com ; e próxima está vazia
    // 3. Linha atual vazia e próxima inicia bloco
    if (
      (isBlockEnd && (nextIsNewBlock || nextIsEmpty)) ||
      (currentIsEmpty && nextIsNewBlock) ||
      (isBlockEnd && currentIsEmpty)
    ) {
      cutLine++; // Inclui esta linha
      break;
    }

    cutLine++;
    extraLines++;
  }

  // Se atingiu o limite de extras mas ainda não encontrou fim de bloco,
  // força o corte na última linha processada
  const truncatedScript = lines.slice(0, cutLine).join('\n');
  const cutPoint = `Linha ${cutLine} de ${originalLines}`;

  const warningMessage = extraLines > 0
    ? `⚠️ FREE TIER: Script analisado até linha ${cutLine} (${lineLimit} base + ${extraLines} extras para completar bloco). ${originalLines - cutLine} linhas não foram incluídas na análise.`
    : `⚠️ FREE TIER: Script analisado até linha ${lineLimit}. ${originalLines - lineLimit} linhas não foram incluídas na análise.`;

  return {
    truncatedScript,
    originalLines,
    actualLines: cutLine,
    extraLinesAdded: extraLines,
    cutPoint,
    warningMessage,
    wasTruncated: true
  };
}
