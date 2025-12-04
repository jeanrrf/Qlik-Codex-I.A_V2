/**
 * Convex Actions - Qlik Consultancy Agent
 * Migrado de server/src/agents/qlikConsultancyAgent.ts
 */
import { action } from "./_generated/server";
import { v } from "convex/values";

// ==== TYPES ====

interface ScriptAnalysis {
  totalLines: number;
  tables: string[];
  loads: number;
  joins: number;
  residents: number;
  variables: number;
  comments: number;
  loops: number;
  subs: number;
  qvdReads: number;
  sqlBlocks: number;
  dropStatements: number;
  complexity: 'low' | 'medium' | 'high';
}

interface CompactAuditReport {
  id: string;
  generatedAt: string;
  summary: {
    totalLinesOriginal: number;
    totalLinesOptimized: number;
    reductionPercentage: number;
    estimatedLoadTimeReduction: string;
    estimatedRamReduction: string;
  };
  metrics: {
    maintainabilityIndex: { before: number; after: number; delta: number };
    cyclomaticComplexity: { before: number; after: number; delta: number };
    halsteadVolume: { before: number; after: number; delta: number };
  };
  criticalIssues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    line: number;
    description: string;
  }>;
  topRecommendations: Array<{
    title: string;
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    action: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high';
  safeToApply: boolean;
  processingTimeMs: number;
}

// ==== HELPERS ====

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function analyzeScript(script: string): ScriptAnalysis {
  const lines = script.split(/\r?\n/);
  const content = script.toUpperCase();

  const tableMatches = content.match(/\b[A-Z_][A-Z0-9_]*\s*:/g) || [];
  const loadMatches = content.match(/\bLOAD\b/g) || [];
  const joinMatches = content.match(/\b(LEFT\s+)?JOIN\b/g) || [];
  const residentMatches = content.match(/\bRESIDENT\b/g) || [];
  const varMatches = content.match(/\b(LET|SET)\b/g) || [];
  const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*')).length;
  const loopMatches = content.match(/\b(FOR|DO\s+WHILE|DO\s+UNTIL)\b/g) || [];
  const subMatches = content.match(/\bSUB\b/g) || [];
  const qvdMatches = content.match(/\.QVD/gi) || [];
  const sqlMatches = content.match(/\bSQL\s+SELECT\b/gi) || [];
  const dropMatches = content.match(/\bDROP\s+TABLE\b/gi) || [];

  const totalLoads = loadMatches.length;
  const totalJoins = joinMatches.length;
  const totalLoops = loopMatches.length;

  let complexity: 'low' | 'medium' | 'high' = 'low';
  if (lines.length > 500 || totalLoads > 15 || totalJoins > 10 || totalLoops > 3) {
    complexity = 'high';
  } else if (lines.length > 150 || totalLoads > 5 || totalJoins > 3) {
    complexity = 'medium';
  }

  return {
    totalLines: lines.length,
    tables: tableMatches.map(t => t.replace(':', '').trim()),
    loads: totalLoads,
    joins: totalJoins,
    residents: residentMatches.length,
    variables: varMatches.length,
    comments: commentLines,
    loops: totalLoops,
    subs: subMatches.length,
    qvdReads: qvdMatches.length,
    sqlBlocks: sqlMatches.length,
    dropStatements: dropMatches.length,
    complexity
  };
}

function calculateMetrics(script: string, analysis: ScriptAnalysis) {
  // Estimativa simplificada de métricas
  const loc = analysis.totalLines;
  const cc = analysis.loops + (script.match(/\bIF\b/gi) || []).length + 1;

  // Halstead simplificado
  const operators = (script.match(/[\+\-\*\/=<>]/g) || []).length;
  const operands = (script.match(/\b[A-Z0-9_]+\b/gi) || []).length;
  const volume = (operators + operands) * Math.log2(Math.max(1, operators + operands));

  // Maintainability Index simplificado (0-100)
  const mi = Math.max(0, 171 - 5.2 * Math.log(Math.max(1, volume)) - 0.23 * cc - 16.2 * Math.log(Math.max(1, loc)));

  return {
    maintainabilityIndex: Math.round(mi),
    cyclomaticComplexity: cc,
    halsteadVolume: Math.round(volume),
    linesOfCode: loc,
    commentRatio: loc > 0 ? Math.round((analysis.comments / loc) * 100) : 0,
    selectStarCount: (script.match(/SELECT\s+\*/gi) || []).length + (script.match(/LOAD\s+\*/gi) || []).length,
    residentLoadsCount: analysis.residents,
    sqlPushdownOpportunities: (script.match(/LOAD\s+.*\s+FROM/gi) || []).length // Simplificado
  };
}

// ==== EXPORTED LOGIC ====

export function generateCompactAuditReport(
  originalScript: string,
  optimizedScript: string,
  riskLevel: string
): CompactAuditReport {
  const startTime = Date.now();
  const docId = generateId();

  const originalAnalysis = analyzeScript(originalScript);
  const optimizedAnalysis = analyzeScript(optimizedScript);

  const originalMetrics = calculateMetrics(originalScript, originalAnalysis);
  const optimizedMetrics = calculateMetrics(optimizedScript, optimizedAnalysis);

  // Calcular deltas
  const reductionPercentage = Math.round(((originalAnalysis.totalLines - optimizedAnalysis.totalLines) / originalAnalysis.totalLines) * 100) || 0;

  // Issues Críticos
  const criticalIssues: CompactAuditReport['criticalIssues'] = [];

  if (optimizedMetrics.selectStarCount > 0) {
    criticalIssues.push({
      type: 'PERFORMANCE',
      severity: 'high',
      line: 0,
      description: `Detectados ${optimizedMetrics.selectStarCount} usos de SELECT * ou LOAD * (alto consumo de RAM)`
    });
  }

  if (optimizedMetrics.maintainabilityIndex < 40) {
    criticalIssues.push({
      type: 'MAINTAINABILITY',
      severity: 'high',
      line: 0,
      description: `Índice de manutenibilidade baixo (${optimizedMetrics.maintainabilityIndex}/100)`
    });
  }

  // Recomendações
  const topRecommendations: CompactAuditReport['topRecommendations'] = [];

  if (riskLevel === 'High') {
    topRecommendations.push({
      title: 'Revisão Manual Obrigatória',
      impact: 'high',
      effort: 'high',
      action: 'Mudanças de alto risco detectadas. Valide lógica de negócio.'
    });
  }

  if (optimizedMetrics.selectStarCount > 0) {
    topRecommendations.push({
      title: 'Remover LOAD *',
      impact: 'high',
      effort: 'medium',
      action: 'Liste explicitamente os campos necessários.'
    });
  }

  if (optimizedMetrics.residentLoadsCount > 5) {
    topRecommendations.push({
      title: 'Otimizar Resident Loads',
      impact: 'medium',
      effort: 'medium',
      action: 'Considere consolidar tabelas ou usar JOINs.'
    });
  }

  if (topRecommendations.length === 0) {
    topRecommendations.push({
      title: 'Script Otimizado',
      impact: 'low',
      effort: 'low',
      action: 'O script segue boas práticas.'
    });
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    id: docId,
    generatedAt: new Date().toISOString(),
    summary: {
      totalLinesOriginal: originalAnalysis.totalLines,
      totalLinesOptimized: optimizedAnalysis.totalLines,
      reductionPercentage,
      estimatedLoadTimeReduction: `${Math.max(0, reductionPercentage * 0.8).toFixed(1)}%`,
      estimatedRamReduction: `${Math.max(0, reductionPercentage * 0.6).toFixed(1)}%`
    },
    metrics: {
      maintainabilityIndex: {
        before: originalMetrics.maintainabilityIndex,
        after: optimizedMetrics.maintainabilityIndex,
        delta: optimizedMetrics.maintainabilityIndex - originalMetrics.maintainabilityIndex
      },
      cyclomaticComplexity: {
        before: originalMetrics.cyclomaticComplexity,
        after: optimizedMetrics.cyclomaticComplexity,
        delta: optimizedMetrics.cyclomaticComplexity - originalMetrics.cyclomaticComplexity
      },
      halsteadVolume: {
        before: originalMetrics.halsteadVolume,
        after: optimizedMetrics.halsteadVolume,
        delta: optimizedMetrics.halsteadVolume - originalMetrics.halsteadVolume
      }
    },
    criticalIssues,
    topRecommendations: topRecommendations.slice(0, 5),
    overallRisk: riskLevel as 'low' | 'medium' | 'high',
    safeToApply: riskLevel !== 'High',
    processingTimeMs
  };
}

// ==== ACTION ====

export const generateReport = action({
  args: {
    originalScript: v.string(),
    optimizedScript: v.string(),
    riskLevel: v.string(), // "Low" | "Medium" | "High"
  },
  handler: async (_ctx, args) => {
    return generateCompactAuditReport(args.originalScript, args.optimizedScript, args.riskLevel);
  },
});