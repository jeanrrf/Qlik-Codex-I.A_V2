
export interface ScriptComplexityMetrics {
  lines: number;
  size: number;
  estimatedTokens: number;
  complexity: "low" | "medium" | "high" | "critical";
}

export function analyzeScriptComplexity(script: string): ScriptComplexityMetrics {
  const lines = script.split(/\r?\n/).length;
  const size = new Blob([script]).size;
  const estimatedTokens = Math.ceil(script.length / 4);

  let complexity: "low" | "medium" | "high" | "critical" = "low";
  if (lines > 1000 || size > 100000) {
    complexity = "critical";
  } else if (lines > 500 || size > 50000) {
    complexity = "high";
  } else if (lines > 200 || size > 20000) {
    complexity = "medium";
  }

  return {
    lines,
    size,
    estimatedTokens,
    complexity
  };
}
