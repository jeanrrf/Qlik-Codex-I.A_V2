/**
 * Metrics Calculator - Cálculo Real de Métricas (não fake)
 * Calcula métricas quantitativas precisas do script Qlik
 */

import { RealMetrics } from "../types/qlik";
import { parseQlikScript, ParsedScript } from "../lib/qlikParser";

/**
 * Calcula métricas reais do script
 * ZERO dados fake - tudo baseado em análise programática
 */
export function calculateRealMetrics(script: string): RealMetrics {
  const parsed = parseQlikScript(script);
  const lines = script.split(/\r?\n/);

  // === CÓDIGO ===
  const linesOfCode = lines.length;
  const codeLines = parsed.metrics.codeLines;
  const commentLines = parsed.metrics.commentLines;
  const commentRatio = linesOfCode > 0
    ? Math.round((commentLines / linesOfCode) * 100)
    : 0;

  // === COMPLEXIDADE ===
  const cyclomaticComplexity = parsed.complexity.cyclomaticComplexity;
  const loadStatements = parsed.complexity.loadCount;
  const joinStatements = parsed.complexity.joinCount;
  const loopStatements = parsed.complexity.loopCount;
  const tableCount = parsed.complexity.tableCount;

  // === ANTI-PATTERNS ===
  const selectStarCount = parsed.antiPatterns.filter(
    ap => ap.type === 'SELECT_STAR'
  ).length;

  const syntheticKeysRisk = calculateSyntheticKeyRisk(parsed);
  const cartesianProductRisk = calculateCartesianRisk(parsed);

  // === PERFORMANCE ===
  const residentLoadsCount = parsed.tables.filter(
    t => t.isResident
  ).length;

  const qvdOperations = countQVDOperations(script);
  const sqlPushdownOpportunities = detectSQLPushdownOpportunities(parsed);

  // === MÉTRICAS QLIK-ESPECÍFICAS ===
  const qlikSpecificMetrics = calculateQlikSpecificMetrics(parsed, script);

  // === QUALIDADE ===
  const avgComplexityPerLoad = loadStatements > 0
    ? Math.round(cyclomaticComplexity / loadStatements * 10) / 10
    : 0;

  const maintainabilityIndex = calculateMaintainabilityIndex({
    cyclomaticComplexity,
    linesOfCode: codeLines,
    commentRatio,
    antiPatternCount: parsed.antiPatterns.filter(ap => ap.severity === 'high' || ap.severity === 'critical').length
  });

  return {
    linesOfCode,
    codeLines,
    commentLines,
    commentRatio,
    cyclomaticComplexity,
    loadStatements,
    joinStatements,
    loopStatements,
    tableCount,
    selectStarCount,
    syntheticKeysRisk,
    cartesianProductRisk,
    residentLoadsCount,
    qvdOperations,
    sqlPushdownOpportunities,
    avgComplexityPerLoad,
    maintainabilityIndex,
    // Novas métricas Qlik-específicas
    qlikOptimizationScore: qlikSpecificMetrics.optimizationScore,
    qvdOptimizationRatio: qlikSpecificMetrics.qvdOptimizationRatio,
    denormalizationFactor: qlikSpecificMetrics.denormalizationFactor,
    fieldUsageEfficiency: qlikSpecificMetrics.fieldUsageEfficiency
  };
}

/**
 * Calcula métricas Qlik-específicas avançadas
 */
function calculateQlikSpecificMetrics(parsed: ParsedScript, script: string): {
  optimizationScore: number;
  qvdOptimizationRatio: number;
  denormalizationFactor: number;
  fieldUsageEfficiency: number;
} {
  // 1. QVD Optimization Ratio (% de LOADs otimizados)
  const qvdLoads = parsed.tables.filter(t =>
    t.source && t.source.match(/FROM\s+.*\.qvd/i)
  );

  let optimizedQvdLoads = 0;
  for (const table of qvdLoads) {
    // QVD é otimizado se:
    // - Não tem transformações (LOAD *)
    // - Não tem WHERE (exceto WHERE EXISTS)
    // - Não tem renomeações
    const hasTransformations = table.fields.some(f =>
      f.includes('AS ') || f.includes('(') || f.includes(')')
    );

    const hasNonExistsWhere = script
      .split('\n')
      .some(line =>
        line.includes(table.name) &&
        /WHERE\s+(?!EXISTS)/i.test(line)
      );

    if (!hasTransformations && !hasNonExistsWhere) {
      optimizedQvdLoads++;
    }
  }

  const qvdOptimizationRatio = qvdLoads.length > 0
    ? Math.round((optimizedQvdLoads / qvdLoads.length) * 100)
    : 100; // Se não tem QVDs, assume 100%

  // 2. Denormalization Factor (JOINs vs ApplyMap)
  const joinCount = parsed.joins.length;
  const applyMapCount = (script.match(/ApplyMap\s*\(/gi) || []).length;

  // Ideal: mais ApplyMap, menos JOINs
  // Fator = JOINs / (JOINs + ApplyMap) * 100
  // Quanto menor, melhor (mais desnormalizado/eficiente)
  const denormalizationFactor = (joinCount + applyMapCount) > 0
    ? Math.round((joinCount / (joinCount + applyMapCount)) * 100)
    : 0;

  // 3. Field Usage Efficiency (campos carregados vs realmente usados)
  // Estimativa: se muitos LOAD *, eficiência baixa
  const loadStarCount = (script.match(/^\s*LOAD\s+\*/gim) || []).length;
  const totalLoads = parsed.complexity.loadCount;

  const fieldUsageEfficiency = totalLoads > 0
    ? Math.round((1 - (loadStarCount / totalLoads)) * 100)
    : 100;

  // 4. Qlik Optimization Score geral (0-100)
  // Combina: QVD optimization, denormalization, field efficiency, anti-patterns
  const antiPatternPenalty = Math.min(30, parsed.antiPatterns.length * 5);
  const optimizationScore = Math.round(
    (qvdOptimizationRatio * 0.3) +
    ((100 - denormalizationFactor) * 0.3) +
    (fieldUsageEfficiency * 0.3) +
    (10 - antiPatternPenalty * 0.1)
  );

  return {
    optimizationScore: Math.max(0, Math.min(100, optimizationScore)),
    qvdOptimizationRatio,
    denormalizationFactor,
    fieldUsageEfficiency
  };
}

/**
 * Calcula risco de chaves sintéticas (0-10)
 */
function calculateSyntheticKeyRisk(parsed: ParsedScript): number {
  const syntheticKeyPatterns = parsed.antiPatterns.filter(
    ap => ap.type === 'SYNTHETIC_KEY_RISK'
  );

  // Fórmula: cada anti-pattern soma 2 pontos, cap em 10
  const baseRisk = syntheticKeyPatterns.length * 2;

  // Penalizar joins sem qualificação
  const unqualifiedJoins = parsed.joins.filter(j => j.type === 'JOIN').length;
  const joinPenalty = unqualifiedJoins * 1;

  return Math.min(10, baseRisk + joinPenalty);
}

/**
 * Calcula risco de produto cartesiano (0-10)
 */
function calculateCartesianRisk(parsed: ParsedScript): number {
  const cartesianPatterns = parsed.antiPatterns.filter(
    ap => ap.type === 'CARTESIAN_PRODUCT' || ap.type === 'CROSS_JOIN'
  );

  // Crítico = 10, high = 7, medium = 4
  let risk = 0;
  for (const pattern of cartesianPatterns) {
    if (pattern.severity === 'critical') risk += 10;
    else if (pattern.severity === 'high') risk += 7;
    else if (pattern.severity === 'medium') risk += 4;
  }

  return Math.min(10, risk);
}

/**
 * Conta operações QVD (leitura + gravação)
 */
function countQVDOperations(script: string): number {
  const upperScript = script.toUpperCase();

  // FROM .qvd ou FROM [...qvd]
  const reads = (upperScript.match(/FROM\s+\[?[^\]]*\.QVD/gi) || []).length;

  // STORE table INTO .qvd
  const writes = (upperScript.match(/STORE\s+\w+\s+INTO\s+\[?[^\]]*\.QVD/gi) || []).length;

  return reads + writes;
}

/**
 * Detecta oportunidades de SQL pushdown
 */
function detectSQLPushdownOpportunities(parsed: ParsedScript): number {
  let opportunities = 0;

  // LOAD com cálculos simples seguido de SQL SELECT
  // Isso poderia ser pushado pro banco
  for (const table of parsed.tables) {
    if (table.source && table.source.toUpperCase().includes('SQL SELECT')) {
      // Se tem WHERE em LOAD mas não no SQL = oportunidade
      opportunities++;
    }
  }

  // RESIDENT loads que poderiam ser JOINs ou SQL
  const heavyResidents = parsed.tables.filter(
    t => t.isResident && t.fields.length > 5
  );
  opportunities += Math.floor(heavyResidents.length / 2);

  return opportunities;
}

/**
 * Calcula índice de manutenibilidade (0-100)
 * Baseado em Microsoft Maintainability Index adaptado
 */
function calculateMaintainabilityIndex(params: {
  cyclomaticComplexity: number;
  linesOfCode: number;
  commentRatio: number;
  antiPatternCount: number;
}): number {
  const { cyclomaticComplexity, linesOfCode, commentRatio, antiPatternCount } = params;

  // Fórmula simplificada adaptada do MI original
  // MI = 171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC)
  // Onde V = volume (aprox LOC), G = complexidade ciclomática

  const volume = Math.max(1, linesOfCode);
  const complexity = Math.max(1, cyclomaticComplexity);

  let mi = 171
    - 5.2 * Math.log(volume)
    - 0.23 * complexity
    - 16.2 * Math.log(volume);

  // Normalizar para 0-100
  mi = Math.max(0, Math.min(171, mi));
  mi = (mi / 171) * 100;

  // Bonificação por comentários (até +10)
  const commentBonus = Math.min(10, commentRatio / 2);
  mi += commentBonus;

  // Penalidade por anti-patterns (-5 por cada crítico)
  const antiPatternPenalty = antiPatternCount * 5;
  mi -= antiPatternPenalty;

  return Math.round(Math.max(0, Math.min(100, mi)));
}

/**
 * Formata métricas para exibição compacta
 */
export function formatMetricsCompact(metrics: RealMetrics): string {
  return `LOC: ${metrics.linesOfCode} | Complexidade: ${metrics.cyclomaticComplexity} | LOADs: ${metrics.loadStatements} | JOINs: ${metrics.joinStatements} | MI: ${metrics.maintainabilityIndex}/100`;
}

/**
 * Retorna lista de problemas críticos baseados em métricas
 */
export function getCriticalIssuesFromMetrics(metrics: RealMetrics): string[] {
  const issues: string[] = [];

  if (metrics.cyclomaticComplexity > 50) {
    issues.push(`Complexidade ciclomática alta (${metrics.cyclomaticComplexity})`);
  }

  if (metrics.selectStarCount > 0) {
    issues.push(`${metrics.selectStarCount} uso(s) de SELECT * detectado(s)`);
  }

  if (metrics.syntheticKeysRisk >= 7) {
    issues.push(`Alto risco de chaves sintéticas (${metrics.syntheticKeysRisk}/10)`);
  }

  if (metrics.cartesianProductRisk >= 7) {
    issues.push(`Alto risco de produto cartesiano (${metrics.cartesianProductRisk}/10)`);
  }

  if (metrics.maintainabilityIndex < 40) {
    issues.push(`Índice de manutenibilidade baixo (${metrics.maintainabilityIndex}/100)`);
  }

  if (metrics.commentRatio < 5 && metrics.linesOfCode > 100) {
    issues.push(`Documentação insuficiente (${metrics.commentRatio}% de comentários)`);
  }

  if (metrics.avgComplexityPerLoad > 10) {
    issues.push(`LOADs muito complexos (média: ${metrics.avgComplexityPerLoad})`);
  }

  return issues;
}
