/**
 * AINEX Stage 5: Multi-Layer Validation
 * 4 camadas: sintaxe, semântica, performance, equivalência lógica
 */

import { logger } from "../lib/logger";
import { validateQlikScript } from "../validators/qlikValidator";
import { parseQlikScript } from "../lib/qlikParser";
import { type SemanticAnalysisResult } from "./qlikSemanticAgent";

export interface MultiLayerValidationResult {
  isValid: boolean;
  layers: {
    syntax: ValidationLayer;
    semantic: ValidationLayer;
    performance: ValidationLayer;
    equivalence: ValidationLayer;
  };
  overallScore: number; // 0-100
  blockingIssues: string[];
}

export interface ValidationLayer {
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: string[];
}

export interface ValidationIssue {
  severity: "BLOCKING" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  line?: number;
  suggestion?: string;
}

/**
 * Valida código otimizado em múltiplas camadas
 */
export async function runMultiLayerValidation(
  originalScript: string,
  optimizedScript: string,
  originalSemanticAnalysis: SemanticAnalysisResult
): Promise<MultiLayerValidationResult> {
  logger.info("✅ [STAGE 5] Multi-Layer Validation");

  // Layer 1: Syntax (bloqueante)
  const syntaxLayer = validateSyntax(optimizedScript);
  logger.info(`📝 Syntax: ${syntaxLayer.passed ? '✅' : '❌'} (${syntaxLayer.score}/100)`);

  // Layer 2: Semantic (campos existem, referências válidas)
  const semanticLayer = validateSemantic(optimizedScript);
  logger.info(`🔍 Semantic: ${semanticLayer.passed ? '✅' : '❌'} (${semanticLayer.score}/100)`);

  // Layer 3: Performance (não introduziu novos gargalos)
  const performanceLayer = validatePerformance(optimizedScript, originalSemanticAnalysis);
  logger.info(`⚡ Performance: ${performanceLayer.passed ? '✅' : '❌'} (${performanceLayer.score}/100)`);

  // Layer 4: Equivalence (lógica preservada)
  const equivalenceLayer = validateEquivalence(originalScript, optimizedScript);
  logger.info(`🔄 Equivalence: ${equivalenceLayer.passed ? '✅' : '❌'} (${equivalenceLayer.score}/100)`);

  const layers = { syntax: syntaxLayer, semantic: semanticLayer, performance: performanceLayer, equivalence: equivalenceLayer };
  const overallScore = Math.round((syntaxLayer.score + semanticLayer.score + performanceLayer.score + equivalenceLayer.score) / 4);
  const blockingIssues = Object.values(layers).flatMap(l => l.issues.filter(i => i.severity === "BLOCKING").map(i => i.message));

  const isValid = blockingIssues.length === 0;

  logger.info(`📊 Overall Validation Score: ${overallScore}/100 | Blocking: ${blockingIssues.length}`);

  return { isValid, layers, overallScore, blockingIssues };
}

function validateSyntax(script: string): ValidationLayer {
  const validation = validateQlikScript(script);

  if (!validation.isValid) {
    return {
      passed: false,
      score: 0,
      issues: [{
        severity: "BLOCKING",
        message: validation.error || "Syntax error detected",
        suggestion: "Fix syntax before proceeding"
      }],
      warnings: []
    };
  }

  return { passed: true, score: 100, issues: [], warnings: [] };
}

function validateSemantic(script: string): ValidationLayer {
  const parsed = parseQlikScript(script);
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];

  // Verifica campos referenciados mas não carregados
  const loadedFields = new Set(parsed.tables.flatMap(t => t.fields.map(f => f.split(/\s+as\s+/i).pop()?.trim() || f)));
  const referencedFields = script.match(/\b[A-Z][A-Za-z0-9_]+\b/g) || [];

  referencedFields.forEach(field => {
    if (!loadedFields.has(field) && !['LET', 'SET', 'IF', 'THEN', 'ELSE'].includes(field)) {
      warnings.push(`Field "${field}" referenced but not found in loaded tables`);
    }
  });

  const score = Math.max(0, 100 - warnings.length * 10);
  const passed = issues.filter(i => i.severity === "BLOCKING").length === 0;

  return { passed, score, issues, warnings };
}

function validatePerformance(optimizedScript: string, originalAnalysis: SemanticAnalysisResult): ValidationLayer {
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];

  // Verifica se introduziu novos SELECT *
  const selectStarCount = (optimizedScript.match(/SELECT\s+\*\s+FROM/gi) || []).length;
  if (selectStarCount > 0) {
    warnings.push(`${selectStarCount} SELECT * statements detected (performance risk)`);
  }

  // Verifica nested loops
  if (/FOR.*FOR.*NEXT.*NEXT/si.test(optimizedScript)) {
    issues.push({
      severity: "HIGH",
      message: "Nested loops detected (O(n²) complexity)",
      suggestion: "Refactor to use single-pass logic or RESIDENT LOAD"
    });
  }

  // Verifica JOINs sem WHERE
  const joinLines = optimizedScript.split('\n').filter(l => /LEFT\s+JOIN/i.test(l));
  joinLines.forEach(line => {
    if (!/WHERE/i.test(line)) {
      warnings.push("JOIN without WHERE clause (cartesian risk)");
    }
  });

  const score = Math.max(0, 100 - issues.length * 15 - warnings.length * 5);
  const passed = issues.filter(i => i.severity === "BLOCKING").length === 0;

  return { passed, score, issues, warnings };
}

function validateEquivalence(originalScript: string, optimizedScript: string): ValidationLayer {
  const issues: ValidationIssue[] = [];
  const warnings: string[] = [];

  const originalParsed = parseQlikScript(originalScript);
  const optimizedParsed = parseQlikScript(optimizedScript);

  // Verifica se número de tabelas mudou drasticamente
  const tableDiff = Math.abs(originalParsed.tables.length - optimizedParsed.tables.length);
  if (tableDiff > 3) {
    warnings.push(`Table count changed significantly: ${originalParsed.tables.length} → ${optimizedParsed.tables.length}`);
  }

  // Verifica se tabelas principais foram preservadas
  const originalTableNames = new Set(originalParsed.tables.map(t => t.name));
  const optimizedTableNames = new Set(optimizedParsed.tables.map(t => t.name));

  originalTableNames.forEach(name => {
    if (!optimizedTableNames.has(name) && !name.includes("Temp") && !name.includes("_bak")) {
      warnings.push(`Table "${name}" removed (verify if intentional)`);
    }
  });

  const score = Math.max(0, 100 - warnings.length * 8);
  const passed = issues.filter(i => i.severity === "BLOCKING").length === 0;

  return { passed, score, issues, warnings };
}
