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
  chunkingRecommended: boolean;
  recommendedStrategy: 'full' | 'chunked' | 'optimized';
}

export interface ChunkStrategy {
  shouldChunk: boolean;
  chunkSize: number;
  overlapLines: number;
  focusAreas: string[]; // Áreas críticas para análise (ex: "QVD operations", "SQL blocks")
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

  // Decide chunking
  // ⚠️ FREE TIER: NUNCA chunka scripts truncados (já foram limitados)
  // QVD/QVS com mais de 800 linhas OU mais de 40k tokens → chunk
  const chunkingRecommended = !isTruncated && (
    (
      (fileType === 'qvd' || fileType === 'qvs') &&
      (lineCount > 800 || estimatedTokens > 40000)
    ) || (lineCount > 1500 || estimatedTokens > 80000)
  );

  // Estratégia recomendada
  let recommendedStrategy: ScriptCharacteristics['recommendedStrategy'];
  if (!chunkingRecommended && estimatedTokens < 30000) {
    recommendedStrategy = 'full'; // Análise completa tradicional
  } else if (chunkingRecommended) {
    recommendedStrategy = 'chunked'; // Análise por chunks com consolidação
  } else {
    recommendedStrategy = 'optimized'; // Análise otimizada com foco em áreas críticas
  }

  return {
    fileType,
    size,
    complexity,
    hasQVDOperations,
    qvdReadCount,
    qvdWriteCount,
    estimatedTokens,
    lineCount,
    chunkingRecommended,
    recommendedStrategy
  };
}

/**
 * Gera estratégia de chunking otimizada baseada nas características
 */
export function generateChunkStrategy(characteristics: ScriptCharacteristics): ChunkStrategy {
  if (!characteristics.chunkingRecommended) {
    return {
      shouldChunk: false,
      chunkSize: 0,
      overlapLines: 0,
      focusAreas: []
    };
  }

  // Define tamanho do chunk baseado na complexidade
  let chunkSize: number;
  switch (characteristics.complexity) {
    case 'low':
      chunkSize = 400; // Chunks maiores para código simples
      break;
    case 'medium':
      chunkSize = 300;
      break;
    case 'high':
      chunkSize = 200;
      break;
    case 'critical':
      chunkSize = 150; // Chunks menores para análise mais precisa
      break;
  }

  // Overlap para manter contexto entre chunks
  const overlapLines = Math.floor(chunkSize * 0.15); // 15% de overlap

  // Áreas de foco
  const focusAreas: string[] = [];
  if (characteristics.hasQVDOperations) {
    focusAreas.push('QVD operations');
  }
  if (characteristics.complexity === 'high' || characteristics.complexity === 'critical') {
    focusAreas.push('Complex joins', 'SQL blocks', 'Loops');
  }
  focusAreas.push('Anti-patterns', 'Performance issues');

  return {
    shouldChunk: true,
    chunkSize,
    overlapLines,
    focusAreas
  };
}

/**
 * Divide o script em chunks inteligentes respeitando limites de contexto
 */
export function createScriptChunks(
  script: string,
  strategy: ChunkStrategy
): Array<{ chunk: string; startLine: number; endLine: number; context: string }> {
  if (!strategy.shouldChunk) {
    return [{ chunk: script, startLine: 1, endLine: script.split(/\r?\n/).length, context: 'Full script' }];
  }

  const lines = script.split(/\r?\n/);
  const chunks: Array<{ chunk: string; startLine: number; endLine: number; context: string }> = [];

  let i = 0;
  let chunkNumber = 0;

  while (i < lines.length) {
    chunkNumber++;
    const endIndex = Math.min(i + strategy.chunkSize, lines.length);

    // Inclui overlap do chunk anterior (exceto no primeiro)
    const actualStartIndex = i === 0 ? 0 : Math.max(0, i - strategy.overlapLines); const chunkLines = lines.slice(actualStartIndex, endIndex);
    const chunk = chunkLines.join('\n');

    // Identifica contexto do chunk
    const upperChunk = chunk.toUpperCase();
    const contexts: string[] = [];

    if (upperChunk.includes('FROM') && upperChunk.includes('.QVD')) {
      contexts.push('QVD Read');
    }
    if (upperChunk.includes('STORE') && upperChunk.includes('.QVD')) {
      contexts.push('QVD Write');
    }
    if (upperChunk.includes('SQL SELECT')) {
      contexts.push('SQL Block');
    }
    if (upperChunk.includes('JOIN')) {
      contexts.push('Joins');
    }
    if (upperChunk.includes('FOR') || upperChunk.includes('DO WHILE')) {
      contexts.push('Loops');
    }

    const context = contexts.length > 0
      ? `Chunk ${chunkNumber}: ${contexts.join(', ')}`
      : `Chunk ${chunkNumber}`;

    chunks.push({
      chunk,
      startLine: actualStartIndex + 1,
      endLine: endIndex,
      context
    });

    // Avança para próximo chunk (sem overlap)
    i = endIndex;
  }

  return chunks;
}

/**
 * Cria um prompt compactado para análise de chunk específico
 */
export function createChunkPrompt(
  basePrompt: string,
  chunk: string,
  chunkInfo: { context: string; chunkNumber: number; totalChunks: number; focusAreas: string[] }
): string {
  // Remove partes desnecessárias do prompt para chunks
  const compactPrompt = basePrompt
    .replace(/═{50,}/g, '═══') // Reduz separadores visuais
    .replace(/\n{3,}/g, '\n\n'); // Remove quebras excessivas

  return `${compactPrompt}

╭──────────────────────────────────────────────────────────╮
│ CHUNK ANALYSIS MODE (${chunkInfo.chunkNumber}/${chunkInfo.totalChunks})
╰──────────────────────────────────────────────────────────╯

Contexto deste chunk: ${chunkInfo.context}
Áreas de foco: ${chunkInfo.focusAreas.join(', ')}

⚠️  IMPORTANTE - Modo Chunk:
1. Analise APENAS o código abaixo (parte ${chunkInfo.chunkNumber} de ${chunkInfo.totalChunks})
2. Identifique problemas CONCRETOS neste trecho específico
3. Cite números de linha relativos a este chunk
4. NÃO faça suposições sobre código fora deste chunk
5. Concentre-se em: ${chunkInfo.focusAreas.join(', ')}

════════════════════════════════════════════════════════════
CÓDIGO DO CHUNK ${chunkInfo.chunkNumber}:
════════════════════════════════════════════════════════════

${chunk}

════════════════════════════════════════════════════════════
`;
}

/**
 * Mescla resultados de múltiplos chunks em um resultado consolidado
 */
export function mergeChunkResults(
  chunkResults: Array<{ changes: any[]; summary: string; metricsEstimate?: any }>,
  originalScript: string
): { changes: any[]; summary: string; metricsEstimate?: any } {
  // Deduplica mudanças por área/linha
  const uniqueChanges = new Map<string, any>();

  for (const result of chunkResults) {
    for (const change of result.changes) {
      const key = `${change.category}-${change.area}`;

      // Se já existe, mantém o de maior impacto
      if (uniqueChanges.has(key)) {
        const existing = uniqueChanges.get(key);
        const existingImpact = parseImpactScore(existing.impact);
        const newImpact = parseImpactScore(change.impact);

        if (newImpact > existingImpact) {
          uniqueChanges.set(key, change);
        }
      } else {
        uniqueChanges.set(key, change);
      }
    }
  }

  // Consolida summary
  const summaries = chunkResults.map(r => r.summary).filter(s => s && s.length > 0);
  const consolidatedSummary = summaries.length > 0
    ? `Análise consolidada de ${chunkResults.length} chunks:\n\n${summaries.join('\n\n')}`
    : 'Análise concluída';

  // Mescla métricas (usa média)
  let mergedMetrics: any = undefined;
  const metricsArray = chunkResults.map(r => r.metricsEstimate).filter(m => m != null);

  if (metricsArray.length > 0) {
    mergedMetrics = {
      estimatedLoadTimeReductionPercent: average(metricsArray.map(m => m.estimatedLoadTimeReductionPercent || 0)),
      estimatedRAMSavingsPercent: average(metricsArray.map(m => m.estimatedRAMSavingsPercent || 0)),
      estimatedLOCReduction: Math.round(sum(metricsArray.map(m => m.estimatedLOCReduction || 0)) / 2), // Divide por 2 para evitar duplicação
      complexityReduction: average(metricsArray.map(m => m.complexityReduction || 0))
    };
  }

  return {
    changes: Array.from(uniqueChanges.values()),
    summary: consolidatedSummary,
    metricsEstimate: mergedMetrics
  };
}

// Helpers
function parseImpactScore(impact: string): number {
  const match = impact.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 0;
}

function average(numbers: number[]): number {
  return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
}

function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
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
