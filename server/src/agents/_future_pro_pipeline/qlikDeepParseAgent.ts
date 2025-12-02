/**
 * AINEX Stage 1: Deep Parse & Syntax Check
 * Análise estrutural completa com AST + detecção de anti-patterns
 */

import { generateStructuredJson, GenerateStructuredJsonOptions } from "../lib/llmClient";
import { logger } from "../lib/logger";
import { parseQlikScript, detectSyntheticKeys, type ParsedScript, type AntiPattern } from "../lib/qlikParser";
import { validateQlikScript } from "../validators/qlikValidator";

export interface DeepParseResult {
  parsed: ParsedScript;
  antiPatterns: AntiPattern[];
  syntaxIssues: string[];
  dependencyMap: DependencyMap;
  structuralScore: number; // 0-100
  complexityWarnings: ComplexityWarning[];
}

export interface DependencyMap {
  tables: Array<{
    name: string;
    dependsOn: string[]; // Tabelas referenciadas
    usedBy: string[]; // Tabelas que a usam
  }>;
  variables: Array<{
    name: string;
    usedInTables: string[];
  }>;
}

export interface ComplexityWarning {
  type: "DEEP_NESTING" | "LONG_FUNCTION" | "CYCLOMATIC_HIGH" | "TOO_MANY_JOINS";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  location: { line: number; table?: string };
  message: string;
  recommendation: string;
}

/**
 * Executa análise profunda do script
 */
export async function runDeepParse(
  script: string,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<DeepParseResult> {
  logger.info("🔍 [STAGE 1] Deep Parse & Syntax Check");

  // Parse estrutural básico
  const parsed = parseQlikScript(script);
  const antiPatterns = detectSyntheticKeys(parsed);

  // Validação de sintaxe
  const validation = validateQlikScript(script);
  const syntaxIssues = validation.isValid ? [] : [validation.error || "Unknown syntax error"];

  logger.info(`📊 Parsed: ${parsed.tables.length} tables, ${parsed.joins.length} joins`);
  logger.info(`⚠️  Anti-patterns: ${antiPatterns.length}`);

  // Mapa de dependências
  const dependencyMap = buildDependencyMap(parsed);

  // Análise de complexidade estrutural
  const complexityWarnings = analyzeStructuralComplexity(parsed, script);

  // Score estrutural (0-100)
  const structuralScore = calculateStructuralScore(parsed, antiPatterns, complexityWarnings);

  logger.info(`📈 Structural Score: ${structuralScore}/100`);

  return {
    parsed,
    antiPatterns,
    syntaxIssues,
    dependencyMap,
    structuralScore,
    complexityWarnings
  };
}

/**
 * Constrói mapa de dependências entre tabelas e variáveis
 */
function buildDependencyMap(parsed: ParsedScript): DependencyMap {
  const tableMap = new Map<string, { dependsOn: Set<string>; usedBy: Set<string> }>();

  // Inicializa mapa de tabelas
  parsed.tables.forEach(table => {
    tableMap.set(table.name, { dependsOn: new Set(), usedBy: new Set() });
  });

  // Mapeia dependências via JOINs
  parsed.joins.forEach(join => {
    const leftTable = join.leftTable;
    const rightTable = join.rightTable;

    if (tableMap.has(leftTable) && tableMap.has(rightTable)) {
      tableMap.get(leftTable)!.dependsOn.add(rightTable);
      tableMap.get(rightTable)!.usedBy.add(leftTable);
    }
  });

  // Converte para formato final
  const tables = Array.from(tableMap.entries()).map(([name, deps]) => ({
    name,
    dependsOn: Array.from(deps.dependsOn),
    usedBy: Array.from(deps.usedBy)
  }));

  // Mapeia variáveis usadas em tabelas
  const variables = parsed.variables.map(v => ({
    name: v.name,
    usedInTables: parsed.tables
      .filter(t => t.fields.some(f => f.includes(v.name)))
      .map(t => t.name)
  }));

  return { tables, variables };
}

/**
 * Analisa complexidade estrutural e emite warnings
 */
function analyzeStructuralComplexity(parsed: ParsedScript, script: string): ComplexityWarning[] {
  const warnings: ComplexityWarning[] = [];
  const lines = script.split(/\r?\n/);

  // 1. Detecta nesting profundo (IF dentro de IF dentro de FOR)
  let nestingLevel = 0;
  let maxNesting = 0;
  lines.forEach((line, idx) => {
    if (/\b(IF|FOR|WHILE|DO)\b/i.test(line)) nestingLevel++;
    if (/\b(END IF|NEXT|LOOP|UNTIL)\b/i.test(line)) nestingLevel--;
    maxNesting = Math.max(maxNesting, nestingLevel);

    if (nestingLevel >= 4) {
      warnings.push({
        type: "DEEP_NESTING",
        severity: "HIGH",
        location: { line: idx + 1 },
        message: `Nesting level ${nestingLevel} detected`,
        recommendation: "Break into separate SUBs or functions"
      });
    }
  });

  // 2. Blocos muito longos (>200 linhas sem separação)
  let currentBlockStart = 0;
  parsed.tables.forEach(table => {
    const blockSize = (table.endLine || 0) - (table.startLine || 0);
    if (blockSize > 200) {
      warnings.push({
        type: "LONG_FUNCTION",
        severity: "MEDIUM",
        location: { line: table.startLine || 0, table: table.name },
        message: `Table ${table.name} has ${blockSize} lines`,
        recommendation: "Split into multiple smaller tables or QVDs"
      });
    }
  });

  // 3. Complexidade ciclomática alta (muitos IFs/WHEREs)
  parsed.tables.forEach(table => {
    const cyclomaticComplexity = (table.fields.join('\n').match(/\b(IF|WHERE|AND|OR)\b/gi) || []).length;
    if (cyclomaticComplexity > 10) {
      warnings.push({
        type: "CYCLOMATIC_HIGH",
        severity: cyclomaticComplexity > 20 ? "CRITICAL" : "HIGH",
        location: { line: table.startLine || 0, table: table.name },
        message: `Cyclomatic complexity: ${cyclomaticComplexity}`,
        recommendation: "Simplify conditions, use lookup tables"
      });
    }
  });

  // 4. Muitos JOINs em cascata
  const joinCascades = new Map<string, number>();
  parsed.joins.forEach(j => {
    joinCascades.set(j.leftTable, (joinCascades.get(j.leftTable) || 0) + 1);
  });

  joinCascades.forEach((count, table) => {
    if (count >= 4) {
      warnings.push({
        type: "TOO_MANY_JOINS",
        severity: count >= 6 ? "CRITICAL" : "HIGH",
        location: { line: 0, table },
        message: `${count} JOINs on table ${table}`,
        recommendation: "Consider using MAPPING LOAD or QVD pre-joins"
      });
    }
  });

  return warnings;
}

/**
 * Calcula score estrutural (0-100)
 */
function calculateStructuralScore(
  parsed: ParsedScript,
  antiPatterns: AntiPattern[],
  warnings: ComplexityWarning[]
): number {
  let score = 100;

  // Penalidades
  score -= antiPatterns.length * 5; // -5 por anti-pattern
  score -= warnings.filter(w => w.severity === "CRITICAL").length * 15; // -15 por crítico
  score -= warnings.filter(w => w.severity === "HIGH").length * 10; // -10 por alto
  score -= warnings.filter(w => w.severity === "MEDIUM").length * 5; // -5 por médio

  // Bônus: boas práticas
  const hasQVD = parsed.tables.some(t => t.name.includes("QVD"));
  const hasMappingLoad = parsed.tables.some(t => t.name.includes("Mapping"));
  if (hasQVD) score += 5;
  if (hasMappingLoad) score += 5;

  return Math.max(0, Math.min(100, score));
}
