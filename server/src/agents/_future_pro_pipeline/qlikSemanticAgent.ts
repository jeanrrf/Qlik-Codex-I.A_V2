/**
 * AINEX Stage 2: Semantic Analysis & Performance Profiling
 * Análise profunda de performance, detecção de gargalos e otimizações
 */

import { generateStructuredJson, GenerateStructuredJsonOptions } from "../lib/llmClient";
import { logger } from "../lib/logger";
import { type ParsedScript } from "../lib/qlikParser";
import { type DeepParseResult } from "./qlikDeepParseAgent";

export interface SemanticAnalysisResult {
  performanceScore: number; // 0-100
  bottlenecks: PerformanceBottleneck[];
  dataFlowIssues: DataFlowIssue[];
  optimizationOpportunities: OptimizationOpportunity[];
  estimatedImpact: PerformanceImpact;
}

export interface PerformanceBottleneck {
  type: "CARTESIAN_RISK" | "INEFFICIENT_JOIN" | "FULL_TABLE_SCAN" | "NESTED_LOOP" | "LARGE_CONCAT";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  location: {
    line: number;
    table: string;
    snippet: string;
  };
  explanation: string;
  estimatedCost: string; // ex: "O(n²)" or "500MB memory"
}

export interface DataFlowIssue {
  type: "MISSING_WHERE" | "DUPLICATE_LOAD" | "UNREFERENCED_TABLE" | "CIRCULAR_DEPENDENCY";
  severity: "LOW" | "MEDIUM" | "HIGH";
  affectedTables: string[];
  description: string;
  recommendation: string;
}

export interface OptimizationOpportunity {
  category: "QVD_CONVERSION" | "INCREMENTAL_LOAD" | "RESIDENT_LOAD" | "MAPPING_LOAD" | "WHERE_CLAUSE" | "FIELD_REDUCTION";
  priority: "HIGH" | "MEDIUM" | "LOW";
  targetTable: string;
  currentState: string;
  proposedState: string;
  estimatedGain: string; // ex: "-60% load time"
}

export interface PerformanceImpact {
  currentComplexity: string; // O notation
  estimatedLoadTime: string;
  memoryUsage: string;
  improvementPotential: {
    timeReduction: string; // ex: "40-60%"
    memoryReduction: string; // ex: "30-50%"
  };
}

/**
 * Executa análise semântica e profiling de performance
 */
export async function runSemanticAnalysis(
  script: string,
  deepParse: DeepParseResult,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<SemanticAnalysisResult> {
  logger.info("🔬 [STAGE 2] Semantic Analysis & Performance Profiling");

  const lines = script.split(/\r?\n/);
  const parsed = deepParse.parsed;

  // 1. Detecta gargalos de performance
  const bottlenecks = detectPerformanceBottlenecks(parsed, lines);
  logger.info(`⚠️  Performance bottlenecks: ${bottlenecks.length}`);

  // 2. Analisa fluxo de dados
  const dataFlowIssues = analyzeDataFlow(parsed, deepParse.dependencyMap);
  logger.info(`🔄 Data flow issues: ${dataFlowIssues.length}`);

  // 3. Identifica oportunidades de otimização
  const opportunities = identifyOptimizationOpportunities(parsed, lines);
  logger.info(`💡 Optimization opportunities: ${opportunities.length}`);

  // 4. Estima impacto de performance
  const estimatedImpact = estimatePerformanceImpact(parsed, bottlenecks, opportunities);

  // 5. Calcula score de performance
  const performanceScore = calculatePerformanceScore(bottlenecks, dataFlowIssues);
  logger.info(`📈 Performance Score: ${performanceScore}/100`);

  return {
    performanceScore,
    bottlenecks,
    dataFlowIssues,
    optimizationOpportunities: opportunities,
    estimatedImpact
  };
}

/**
 * Detecta gargalos de performance no código
 */
function detectPerformanceBottlenecks(parsed: ParsedScript, lines: string[]): PerformanceBottleneck[] {
  const bottlenecks: PerformanceBottleneck[] = [];

  // 1. JOINs sem WHERE (risco cartesiano)
  parsed.joins.forEach(join => {
    const joinLine = lines[join.line - 1] || "";
    const hasWhere = /WHERE/i.test(joinLine) || lines.slice(Math.max(0, join.line - 1), join.line + 3).some(l => /WHERE/i.test(l));

    if (!hasWhere && join.type.includes("LEFT")) {
      bottlenecks.push({
        type: "CARTESIAN_RISK",
        severity: "HIGH",
        location: {
          line: join.line,
          table: join.leftTable,
          snippet: joinLine.trim().substring(0, 80)
        },
        explanation: `LEFT JOIN without WHERE clause can generate cartesian product`,
        estimatedCost: "O(n*m) - potentially millions of rows"
      });
    }
  });

  // 2. SELECT * FROM (full table scan)
  lines.forEach((line, idx) => {
    if (/SELECT\s+\*\s+FROM/i.test(line)) {
      const tableName = (line.match(/FROM\s+(\w+)/i) || [])[1] || "unknown";
      bottlenecks.push({
        type: "FULL_TABLE_SCAN",
        severity: "MEDIUM",
        location: {
          line: idx + 1,
          table: tableName,
          snippet: line.trim().substring(0, 80)
        },
        explanation: "SELECT * loads unnecessary columns, increases memory",
        estimatedCost: "+30-50% memory usage"
      });
    }
  });

  // 3. Nested loops (FOR dentro de FOR)
  let nestingLevel = 0;
  lines.forEach((line, idx) => {
    if (/\bFOR\b/i.test(line)) nestingLevel++;
    if (/\bNEXT\b/i.test(line)) nestingLevel--;

    if (nestingLevel >= 2) {
      bottlenecks.push({
        type: "NESTED_LOOP",
        severity: "CRITICAL",
        location: {
          line: idx + 1,
          table: "Script",
          snippet: line.trim().substring(0, 80)
        },
        explanation: "Nested loops create O(n²) or worse complexity",
        estimatedCost: "O(n²) - exponential growth"
      });
    }
  });

  // 4. CONCATs grandes (múltiplos)
  const concatCounts = new Map<string, number>();
  parsed.tables.forEach(table => {
    const concatCount = table.fields.filter(f => /CONCATENATE/i.test(f)).length;
    if (concatCount >= 3) {
      bottlenecks.push({
        type: "LARGE_CONCAT",
        severity: concatCount >= 5 ? "HIGH" : "MEDIUM",
        location: {
          line: table.startLine || 0,
          table: table.name,
          snippet: `${concatCount} CONCATENATE operations`
        },
        explanation: `Multiple CONCATs cause memory fragmentation`,
        estimatedCost: `+${concatCount * 20}% memory overhead`
      });
    }
  });

  // 5. JOINs ineficientes (muitos campos na condição)
  parsed.joins.forEach(join => {
    const fieldCount = join.fields.length;
    if (fieldCount >= 5) {
      bottlenecks.push({
        type: "INEFFICIENT_JOIN",
        severity: "MEDIUM",
        location: {
          line: join.line,
          table: join.leftTable,
          snippet: `JOIN on ${fieldCount} fields`
        },
        explanation: "Too many join fields slow down matching",
        estimatedCost: `+${fieldCount * 10}% join time`
      });
    }
  });

  return bottlenecks;
}

/**
 * Analisa fluxo de dados e dependências
 */
function analyzeDataFlow(parsed: ParsedScript, dependencyMap: any): DataFlowIssue[] {
  const issues: DataFlowIssue[] = [];

  // 1. Tabelas sem WHERE carregando tudo
  parsed.tables.forEach(table => {
    const hasWhere = table.fields.some(f => /WHERE/i.test(f));
    const isFromSQL = table.fields.some(f => /SQL\s+SELECT/i.test(f));

    if (isFromSQL && !hasWhere && table.fields.length > 50) {
      issues.push({
        type: "MISSING_WHERE",
        severity: "HIGH",
        affectedTables: [table.name],
        description: `SQL SELECT without WHERE loads entire table (${table.fields.length} fields)`,
        recommendation: "Add WHERE clause to filter at source"
      });
    }
  });

  // 2. Carregamentos duplicados (mesmo SELECT FROM)
  const sourceMap = new Map<string, string[]>();
  parsed.tables.forEach(table => {
    const sqlMatch = table.fields.join('\n').match(/SELECT.*FROM\s+(\w+)/i);
    if (sqlMatch) {
      const source = sqlMatch[1];
      if (!sourceMap.has(source)) sourceMap.set(source, []);
      sourceMap.get(source)!.push(table.name);
    }
  });

  sourceMap.forEach((tables, source) => {
    if (tables.length >= 2) {
      issues.push({
        type: "DUPLICATE_LOAD",
        severity: "MEDIUM",
        affectedTables: tables,
        description: `Source table "${source}" loaded ${tables.length} times`,
        recommendation: "Load once into QVD, then use RESIDENT LOAD"
      });
    }
  });

  // 3. Tabelas não referenciadas
  const usedTables = new Set(parsed.joins.flatMap(j => [j.leftTable, j.rightTable]));
  parsed.tables.forEach(table => {
    if (!usedTables.has(table.name) && !table.name.includes("Temp") && !table.name.includes("Final")) {
      issues.push({
        type: "UNREFERENCED_TABLE",
        severity: "LOW",
        affectedTables: [table.name],
        description: `Table "${table.name}" is never joined or referenced`,
        recommendation: "Remove if unused, or add DROP TABLE if temporary"
      });
    }
  });

  return issues;
}

/**
 * Identifica oportunidades de otimização
 */
function identifyOptimizationOpportunities(parsed: ParsedScript, lines: string[]): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];

  // 1. SQL SELECTs que deveriam ser QVDs
  parsed.tables.forEach(table => {
    const hasSQL = table.fields.some(f => /SQL\s+SELECT/i.test(f));
    const isLarge = table.fields.length > 30;

    if (hasSQL && isLarge && !table.name.includes("QVD")) {
      opportunities.push({
        category: "QVD_CONVERSION",
        priority: "HIGH",
        targetTable: table.name,
        currentState: "SQL SELECT (direct database query)",
        proposedState: "QVD LOAD (pre-stored optimized format)",
        estimatedGain: "-70% load time, -40% database load"
      });
    }
  });

  // 2. Tabelas grandes sem carga incremental
  parsed.tables.forEach(table => {
    const hasSQL = table.fields.some(f => /SQL\s+SELECT/i.test(f));
    const hasWhere = table.fields.some(f => /WHERE.*>\s*\$\(/i.test(f)); // WHERE Date > $(vLastRun)

    if (hasSQL && !hasWhere && table.fields.length > 50) {
      opportunities.push({
        category: "INCREMENTAL_LOAD",
        priority: "HIGH",
        targetTable: table.name,
        currentState: "Full load every time",
        proposedState: "Incremental load using LastExecTime variable",
        estimatedGain: "-80% load time on subsequent runs"
      });
    }
  });

  // 3. JOINs que deveriam ser RESIDENT LOAD
  parsed.joins.forEach(join => {
    if (join.type.includes("LEFT") && join.fields.length <= 2) {
      opportunities.push({
        category: "RESIDENT_LOAD",
        priority: "MEDIUM",
        targetTable: join.leftTable,
        currentState: `${join.type} with ${join.rightTable}`,
        proposedState: "RESIDENT LOAD with ApplyMap()",
        estimatedGain: "-50% memory, faster execution"
      });
    }
  });

  // 4. Campos calculados que deveriam usar MAPPING LOAD
  lines.forEach((line, idx) => {
    if (/IF\s*\(\s*\w+\s*=.*,.*,.*\)/i.test(line) && !/MAPPING/i.test(line)) {
      opportunities.push({
        category: "MAPPING_LOAD",
        priority: "MEDIUM",
        targetTable: "Inline calculation",
        currentState: `IF() statement at line ${idx + 1}`,
        proposedState: "MAPPING LOAD + ApplyMap()",
        estimatedGain: "-30% calculation time"
      });
    }
  });

  return opportunities;
}

/**
 * Estima impacto de performance
 */
function estimatePerformanceImpact(
  parsed: ParsedScript,
  bottlenecks: PerformanceBottleneck[],
  opportunities: OptimizationOpportunity[]
): PerformanceImpact {
  // Calcula complexidade atual
  const hasNestedLoops = bottlenecks.some(b => b.type === "NESTED_LOOP");
  const hasCartesian = bottlenecks.some(b => b.type === "CARTESIAN_RISK");
  const currentComplexity = hasNestedLoops ? "O(n²) or worse" : hasCartesian ? "O(n*m)" : "O(n)";

  // Estima tempo de carga (baseado em número de tabelas e joins)
  const tableCount = parsed.tables.length;
  const joinCount = parsed.joins.length;
  const estimatedLoadTime = tableCount > 20 ? "10-30 minutes" : tableCount > 10 ? "3-10 minutes" : "< 3 minutes";

  // Estima uso de memória
  const fieldCount = parsed.tables.reduce((sum, t) => sum + t.fields.length, 0);
  const memoryUsage = fieldCount > 500 ? "High (>2GB)" : fieldCount > 200 ? "Medium (500MB-2GB)" : "Low (<500MB)";

  // Calcula potencial de melhoria
  const criticalBottlenecks = bottlenecks.filter(b => b.severity === "CRITICAL").length;
  const highPriorityOps = opportunities.filter(o => o.priority === "HIGH").length;

  const timeReduction = criticalBottlenecks > 0 ? "60-80%" : highPriorityOps >= 3 ? "40-60%" : "20-40%";
  const memoryReduction = highPriorityOps >= 2 ? "30-50%" : "15-30%";

  return {
    currentComplexity,
    estimatedLoadTime,
    memoryUsage,
    improvementPotential: {
      timeReduction,
      memoryReduction
    }
  };
}

/**
 * Calcula score de performance (0-100)
 */
function calculatePerformanceScore(
  bottlenecks: PerformanceBottleneck[],
  dataFlowIssues: DataFlowIssue[]
): number {
  let score = 100;

  // Penalidades por gargalos
  score -= bottlenecks.filter(b => b.severity === "CRITICAL").length * 20;
  score -= bottlenecks.filter(b => b.severity === "HIGH").length * 10;
  score -= bottlenecks.filter(b => b.severity === "MEDIUM").length * 5;

  // Penalidades por problemas de fluxo
  score -= dataFlowIssues.filter(i => i.severity === "HIGH").length * 10;
  score -= dataFlowIssues.filter(i => i.severity === "MEDIUM").length * 5;

  return Math.max(0, Math.min(100, score));
}
