/**
 * Example: Integrating Vector Store with Qlik Optimization Agents
 * 
 * This file demonstrates how to enhance existing optimization agents
 * with semantic search capabilities from the vector store.
 */

import { findRelevantPatterns, getContextualAdvice } from "../services/knowledgeIndexer";
import { logger } from "../lib/logger";

/**
 * Example 1: Enhance script analysis with relevant patterns
 * 
 * Before optimization, find and include relevant patterns
 * to give the LLM better context.
 */
export async function enhancedScriptAnalysis(script: string): Promise<{
  script: string;
  relevantPatterns: Array<{ id: string; title: string; advice: string; similarity: number }>;
  contextPrompt: string;
}> {
  // Find top 5 most relevant patterns
  const patterns = await findRelevantPatterns(script, 5, 0.6);

  // Build context for LLM prompt
  const contextPrompt = patterns.length > 0
    ? `\n## Padrões Relevantes Detectados\n\n${patterns
        .map(
          (p, idx) =>
            `${idx + 1}. **[${p.pattern.id}]** ${p.pattern.title} (${(p.similarity * 100).toFixed(0)}% relevante)\n   ${p.pattern.advice}`
        )
        .join("\n\n")}\n`
    : "";

  return {
    script,
    relevantPatterns: patterns.map(p => ({
      id: p.pattern.id,
      title: p.pattern.title,
      advice: p.pattern.advice,
      similarity: p.similarity
    })),
    contextPrompt
  };
}

/**
 * Example 2: Contextual optimization suggestions
 * 
 * Given a script and a specific issue, get targeted advice
 */
export async function getOptimizationSuggestions(
  script: string,
  issue: string
): Promise<string> {
  const advice = await getContextualAdvice(script, issue);
  return advice;
}

/**
 * Example 3: Enhanced mega optimizer prompt
 * 
 * Integrate vector search into the mega optimizer workflow
 */
export async function buildEnhancedPrompt(
  script: string,
  mode: "ultra-expert" | "analysis"
): Promise<string> {
  // Get relevant patterns
  const analysis = await enhancedScriptAnalysis(script);

  // Base prompt structure
  const basePrompt = `
# Qlik Script Optimization Task

## Mode: ${mode}

## Script to Analyze
\`\`\`qlik
${script}
\`\`\`

${analysis.contextPrompt}

## Your Task
${
    mode === "ultra-expert"
      ? "Rewrite this script applying the relevant patterns above and additional best practices."
      : "Analyze this script and provide recommendations based on the patterns above."
  }

## Output Format
Return a JSON object with:
- optimizedScript (if mode is ultra-expert)
- analysis (detailed breakdown)
- appliedPatterns (list of pattern IDs applied)
- estimatedImpact (performance/maintainability improvements)
`;

  return basePrompt;
}

/**
 * Example 4: Pre-validation using vector search
 * 
 * Before sending to LLM, check if we already have
 * knowledge about common issues in the script
 */
export async function preValidateScript(script: string): Promise<{
  hasKnownIssues: boolean;
  issues: Array<{ pattern: string; severity: string; advice: string }>;
  shouldProceed: boolean;
}> {
  const patterns = await findRelevantPatterns(script, 10, 0.7);

  const criticalPatterns = patterns.filter(p => p.pattern.severity === "critical");
  const warningPatterns = patterns.filter(p => p.pattern.severity === "warning");

  const issues = [...criticalPatterns, ...warningPatterns].map(p => ({
    pattern: p.pattern.id,
    severity: p.pattern.severity,
    advice: p.pattern.advice
  }));

  return {
    hasKnownIssues: issues.length > 0,
    issues,
    shouldProceed: criticalPatterns.length === 0 // Only block if critical issues found
  };
}

/**
 * Example 5: Build learning context from history
 * 
 * Use vector search to find similar previously optimized scripts
 */
export async function findSimilarOptimizations(
  currentScript: string,
  limit = 3
): Promise<Array<{ content: string; metadata: any; similarity: number }>> {
  const { searchKnowledge } = await import("../services/knowledgeIndexer");

  // Search for similar scripts in history
  // Note: This requires custom knowledge to be added for historical optimizations
  const results = await searchKnowledge(currentScript, limit, 0.5);

  return results.filter(r => r.metadata.type === "optimization_history");
}

/**
 * Example 6: Category-based optimization hints
 * 
 * Based on script content, suggest which categories to focus on
 */
export async function suggestOptimizationFocus(script: string): Promise<{
  primaryFocus: string[];
  recommendations: string[];
}> {
  const patterns = await findRelevantPatterns(script, 10, 0.5);

  // Count patterns by category
  const categoryCount = new Map<string, number>();
  patterns.forEach(p => {
    const category = p.pattern.id.split("-")[0]; // Simple categorization
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
  });

  // Sort by frequency
  const sortedCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  return {
    primaryFocus: sortedCategories.slice(0, 3),
    recommendations: patterns.slice(0, 5).map(p => p.pattern.advice)
  };
}

/**
 * Example 7: Real-time assistance during editing
 * 
 * As user types, provide contextual suggestions
 */
export async function getRealtimeSuggestions(
  currentLine: string,
  previousContext: string
): Promise<{ suggestions: string[]; patterns: string[] }> {
  const combined = `${previousContext}\n${currentLine}`.trim();

  const patterns = await findRelevantPatterns(combined, 3, 0.7);

  const suggestions = patterns.map(
    p => `${p.pattern.title}: ${p.pattern.advice.substring(0, 100)}...`
  );

  const patternIds = patterns.map(p => p.pattern.id);

  return {
    suggestions,
    patterns: patternIds
  };
}

/**
 * Example usage in an optimizer agent:
 */
export async function exampleOptimizeWithVectorStore(script: string): Promise<void> {
  logger.info("Starting optimization with vector store enhancement");

  // Step 1: Pre-validate
  const validation = await preValidateScript(script);
  if (!validation.shouldProceed) {
    logger.warn("Critical issues found, blocking optimization", {
      issues: validation.issues
    });
    return;
  }

  // Step 2: Get enhanced analysis
  const analysis = await enhancedScriptAnalysis(script);
  logger.info(`Found ${analysis.relevantPatterns.length} relevant patterns`);

  // Step 3: Suggest focus areas
  const focus = await suggestOptimizationFocus(script);
  logger.info("Optimization focus areas", { focus: focus.primaryFocus });

  // Step 4: Build enhanced prompt
  const prompt = await buildEnhancedPrompt(script, "ultra-expert");

  // Step 5: Send to LLM (existing code)
  // const result = await llmProvider.generate(prompt);
  logger.info("Enhanced prompt built, ready for LLM");

  // Step 6: Learn from this optimization
  // await addCustomKnowledge(`opt-${Date.now()}`, script, { type: 'optimization_history' });
}

/**
 * Integration Tips:
 * 
 * 1. Call enhancedScriptAnalysis() at the start of qlikMegaOptimizer
 * 2. Include contextPrompt in the main LLM prompt
 * 3. Use preValidateScript() before expensive LLM calls
 * 4. Track applied patterns in optimization results
 * 5. Add successful optimizations as custom knowledge for learning
 * 6. Use category-based hints to customize optimization strategy
 */
