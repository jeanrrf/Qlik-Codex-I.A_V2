/**
 * AINEX Stage 6: Differential Review & Impact Analysis
 * Diff linha-a-linha com justificativa e ROI estimado
 */

import { logger } from "../lib/logger";
import { generateStructuredJson, GenerateStructuredJsonOptions } from "../lib/llmClient";
import * as diff from "diff";

export interface DifferentialReviewResult {
  changes: CodeChange[];
  impactAnalysis: ImpactAnalysis;
  breakingChanges: BreakingChange[];
  migrationNotes: string[];
}

export interface CodeChange {
  lineNumber: number;
  type: "ADDED" | "REMOVED" | "MODIFIED";
  before: string;
  after: string;
  justification: string;
  actionId?: string;
  impact: {
    performance?: string; // ex: "-60% load time"
    memory?: string; // ex: "-40% RAM"
    maintainability?: string; // ex: "+25% readability"
  };
}

export interface ImpactAnalysis {
  totalChanges: number;
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  estimatedROI: {
    timeReduction: string;
    memoryReduction: string;
    maintainabilityGain: string;
  };
  riskAssessment: "LOW" | "MEDIUM" | "HIGH";
}

export interface BreakingChange {
  type: "TABLE_REMOVED" | "FIELD_RENAMED" | "LOGIC_CHANGED";
  description: string;
  affectedAreas: string[];
  mitigation: string;
}

/**
 * Gera análise diferencial com justificativas
 */
export async function runDifferentialReview(
  originalScript: string,
  optimizedScript: string,
  appliedActions: string[],
  llmOptions?: GenerateStructuredJsonOptions
): Promise<DifferentialReviewResult> {
  logger.info("🔬 [STAGE 6] Differential Review & Impact Analysis");

  // Gera diff estruturado
  const changes = generateStructuredDiff(originalScript, optimizedScript);
  logger.info(`📊 Changes: ${changes.linesAdded} added, ${changes.linesRemoved} removed, ${changes.linesModified} modified`);

  // Usa LLM para justificar mudanças significativas
  const significantChanges = identifySignificantChanges(originalScript, optimizedScript);
  const justifiedChanges = await justifyChanges(significantChanges, llmOptions);

  // Análise de impacto
  const impactAnalysis: ImpactAnalysis = {
    totalChanges: changes.linesAdded + changes.linesRemoved + changes.linesModified,
    linesAdded: changes.linesAdded,
    linesRemoved: changes.linesRemoved,
    linesModified: changes.linesModified,
    estimatedROI: estimateROI(justifiedChanges),
    riskAssessment: assessRisk(changes, justifiedChanges)
  };

  // Detecta breaking changes
  const breakingChanges = detectBreakingChanges(originalScript, optimizedScript);
  if (breakingChanges.length > 0) {
    logger.warn(`⚠️  Breaking changes detected: ${breakingChanges.length}`);
  }

  // Notas de migração
  const migrationNotes = generateMigrationNotes(justifiedChanges, breakingChanges);

  return {
    changes: justifiedChanges,
    impactAnalysis,
    breakingChanges,
    migrationNotes
  };
}

function generateStructuredDiff(original: string, optimized: string) {
  const diffResult = diff.diffLines(original, optimized);

  let linesAdded = 0;
  let linesRemoved = 0;
  let linesModified = 0;

  diffResult.forEach(part => {
    const lineCount = (part.value.match(/\n/g) || []).length;
    if (part.added) linesAdded += lineCount;
    else if (part.removed) linesRemoved += lineCount;
    else if (part.value.trim()) linesModified += lineCount;
  });

  return { linesAdded, linesRemoved, linesModified };
}

function identifySignificantChanges(original: string, optimized: string): CodeChange[] {
  const diffResult = diff.diffLines(original, optimized);
  const changes: CodeChange[] = [];

  let lineNumber = 0;
  diffResult.forEach(part => {
    if (part.added) {
      changes.push({
        lineNumber: lineNumber + 1,
        type: "ADDED",
        before: "",
        after: part.value.trim(),
        justification: "", // Será preenchido pelo LLM
        impact: {}
      });
      lineNumber += (part.value.match(/\n/g) || []).length;
    } else if (part.removed) {
      changes.push({
        lineNumber: lineNumber + 1,
        type: "REMOVED",
        before: part.value.trim(),
        after: "",
        justification: "", // Será preenchido pelo LLM
        impact: {}
      });
    } else {
      lineNumber += (part.value.match(/\n/g) || []).length;
    }
  });

  return changes.filter(c => c.before.length > 20 || c.after.length > 20); // Apenas mudanças significativas
}

async function justifyChanges(
  changes: CodeChange[],
  llmOptions?: GenerateStructuredJsonOptions
): Promise<CodeChange[]> {
  if (changes.length === 0) return [];

  const prompt = `
Justify the following code changes with technical rationale and estimated impact:

${changes.slice(0, 20).map((c, idx) => `
Change ${idx + 1}:
Type: ${c.type}
Before: ${c.before.substring(0, 150)}
After: ${c.after.substring(0, 150)}
`).join('\n')}

For each change, provide:
- justification: technical reason for the change
- performance impact (if applicable, e.g., "-60% load time")
- memory impact (if applicable)
- maintainability impact (if applicable)

Return JSON array matching CodeChange structure.
`;

  const schema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        justification: { type: "string" },
        impact: {
          type: "object",
          properties: {
            performance: { type: "string" },
            memory: { type: "string" },
            maintainability: { type: "string" }
          }
        }
      }
    }
  };

  try {
    const result = await generateStructuredJson(prompt, schema, llmOptions);
    return changes.map((c, idx) => ({
      ...c,
      justification: result[idx]?.justification || "Optimization applied",
      impact: result[idx]?.impact || {}
    }));
  } catch (error) {
    logger.warn("Failed to justify changes via LLM, using defaults");
    return changes.map(c => ({ ...c, justification: "Code optimization", impact: {} }));
  }
}

function estimateROI(changes: CodeChange[]): ImpactAnalysis["estimatedROI"] {
  const perfImpacts = changes.filter(c => c.impact.performance).map(c => c.impact.performance!);
  const memImpacts = changes.filter(c => c.impact.memory).map(c => c.impact.memory!);

  const avgPerfReduction = perfImpacts.length > 0 ? "40-60%" : "20-30%";
  const avgMemReduction = memImpacts.length > 0 ? "30-50%" : "15-25%";
  const maintainabilityGain = changes.length > 5 ? "High (+30%)" : "Moderate (+15%)";

  return {
    timeReduction: avgPerfReduction,
    memoryReduction: avgMemReduction,
    maintainabilityGain
  };
}

function assessRisk(diffStats: ReturnType<typeof generateStructuredDiff>, changes: CodeChange[]): "LOW" | "MEDIUM" | "HIGH" {
  const totalChanges = diffStats.linesAdded + diffStats.linesRemoved + diffStats.linesModified;

  if (totalChanges > 100) return "HIGH";
  if (totalChanges > 50) return "MEDIUM";
  return "LOW";
}

function detectBreakingChanges(original: string, optimized: string): BreakingChange[] {
  const breaking: BreakingChange[] = [];
  const originalTables = (original.match(/^(\w+):/gm) || []).map(m => m.replace(":", ""));
  const optimizedTables = (optimized.match(/^(\w+):/gm) || []).map(m => m.replace(":", ""));

  // Tabelas removidas
  originalTables.forEach(table => {
    if (!optimizedTables.includes(table) && !table.includes("Temp")) {
      breaking.push({
        type: "TABLE_REMOVED",
        description: `Table "${table}" was removed`,
        affectedAreas: ["Data model", "Reports using this table"],
        mitigation: "Verify if table is used in visualizations or other scripts"
      });
    }
  });

  return breaking;
}

function generateMigrationNotes(changes: CodeChange[], breaking: BreakingChange[]): string[] {
  const notes: string[] = [];

  if (breaking.length > 0) {
    notes.push("⚠️  Breaking changes detected - review before deploying to production");
    breaking.forEach(b => notes.push(`  - ${b.description}: ${b.mitigation}`));
  }

  if (changes.some(c => c.type === "REMOVED")) {
    notes.push("📝 Some code was removed - ensure it was not referenced elsewhere");
  }

  if (changes.some(c => c.impact.performance)) {
    notes.push("🚀 Performance optimizations applied - measure impact in DEV before PROD");
  }

  notes.push("✅ Test in development environment before production deployment");

  return notes;
}
