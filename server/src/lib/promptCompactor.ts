export interface PromptCompactionStats {
  originalChars: number;
  compactedChars: number;
  reductionPct: number;
  originalLines: number;
  compactedLines: number;
  applied: boolean;
}

export interface CompactionOptions {
  preserveBlockStructure: boolean; // Mantém 1 linha em branco entre blocos
  preserveIndentation: boolean; // Preserva indentação semântica (4 espaços)
  maxConsecutiveBlanks: number; // Máximo de linhas em branco consecutivas
  minReductionPct: number; // Percentual mínimo para considerar redução
}

const DEFAULT_OPTIONS: CompactionOptions = {
  preserveBlockStructure: true,
  preserveIndentation: true,
  maxConsecutiveBlanks: 1,
  minReductionPct: 5
};

export function compactScriptForPrompt(
  script: string,
  options: Partial<CompactionOptions> = {}
): { compacted: string; stats: PromptCompactionStats } {
  const opts: CompactionOptions = { ...DEFAULT_OPTIONS, ...options };

  const lines = script.split(/\r?\n/);
  const cleaned: string[] = [];
  let blankStreak = 0;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      blankStreak += 1;

      if (opts.preserveBlockStructure && blankStreak <= opts.maxConsecutiveBlanks) {
        cleaned.push("");
      }
      continue;
    }

    blankStreak = 0;

    if (opts.preserveIndentation) {
      // Preserva indentação de 4 espaços; normaliza espaços excessivos sem colapsar blocos
      const collapsed = line.replace(/\s{5,}/g, "    ");
      cleaned.push(collapsed);
    } else {
      const collapsed = line.replace(/\s+/g, " ").trim();
      cleaned.push(collapsed);
    }
  }

  const compacted = cleaned.join("\n");
  const reductionPct = Math.max(0, Math.round((1 - compacted.length / Math.max(script.length, 1)) * 100));
  const applied = reductionPct >= opts.minReductionPct || opts.preserveBlockStructure || opts.preserveIndentation;

  return {
    compacted,
    stats: {
      originalChars: script.length,
      compactedChars: compacted.length,
      reductionPct,
      originalLines: lines.length,
      compactedLines: cleaned.length,
      applied
    }
  };
}
