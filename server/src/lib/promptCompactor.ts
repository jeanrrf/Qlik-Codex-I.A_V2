export interface PromptCompactionStats {
  originalChars: number;
  compactedChars: number;
  reductionPct: number;
  originalLines: number;
  compactedLines: number;
  applied: boolean;
}

export function compactScriptForPrompt(script: string, minReductionPct = 5): { compacted: string; stats: PromptCompactionStats } {
  const lines = script.split(/\r?\n/);
  const cleaned: string[] = [];
  let blankStreak = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      blankStreak += 1;
      if (blankStreak > 1) continue;
      cleaned.push("");
      continue;
    }

    blankStreak = 0;
    const collapsed = line.replace(/\s{2,}/g, " ");
    cleaned.push(collapsed);
  }

  const candidate = cleaned.join("\n");
  const reductionPctCandidate = Math.round((1 - candidate.length / Math.max(script.length, 1)) * 100);
  const applied = reductionPctCandidate >= minReductionPct;
  const finalScript = applied ? candidate : script;
  const finalReductionPct = Math.max(0, Math.round((1 - finalScript.length / Math.max(script.length, 1)) * 100));

  return {
    compacted: finalScript,
    stats: {
      originalChars: script.length,
      compactedChars: finalScript.length,
      reductionPct: finalReductionPct,
      originalLines: lines.length,
      compactedLines: applied ? cleaned.length : lines.length,
      applied
    }
  };
}
