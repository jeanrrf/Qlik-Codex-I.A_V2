/**
 * Utility to automatically add visual separators to TRACE commands in Qlik scripts.
 * This improves readability of the execution log.
 */
export function fixTraceSeparators(script: string): { fixed: string; changed: boolean } {
  let changed = false;

  // Regex to find TRACE commands that look like headers (e.g., TRACE '--- Section ---';)
  // or just plain TRACE 'Section';
  const lines = script.split(/\r?\n/);
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match TRACE '...'; or TRACE "...";
    const traceMatch = trimmed.match(/^TRACE\s+(['"])(.*?)\1\s*;/i);

    if (traceMatch) {
      const quote = traceMatch[1];
      const content = traceMatch[2];

      // If it's a header-like trace and doesn't already have separators
      if (content.length > 3 && !content.startsWith('---') && !content.includes('==============')) {
        const separator = '-'.repeat(Math.min(content.length + 8, 60));
        fixedLines.push(`TRACE '${separator}';`);
        fixedLines.push(line);
        fixedLines.push(`TRACE '${separator}';`);
        changed = true;
        continue;
      }
    }

    fixedLines.push(line);
  }

  return {
    fixed: fixedLines.join('\n'),
    changed
  };
}
