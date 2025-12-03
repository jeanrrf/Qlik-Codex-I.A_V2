/**
 * Local advanced Qlik formatter (deterministic, not LLM)
 * - applyLocalAdvancedFormatting(script): synchronous lightweight formatter used by tests
 * - formatWithProgress(script, opts): async function that reports progress and returns full result
 */

export type FormatterAction = {
  id: string;
  description: string;
  applied: boolean;
  risk: 'low' | 'medium' | 'high';
};

export function applyLocalAdvancedFormatting(script: string): { formatted: string; actions: FormatterAction[] } {
  // Normalize line endings and trim
  const lines = script.replace(/\r\n/g, '\n').split('\n');

  const actions: FormatterAction[] = [];

  // 1) Uppercase function names (token before '(')
  const funcRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;

  let upperFuncApplied = false;

  const transformedLines = lines.map((rawLine) => {
    // Preserve right side of ' AS ' (don't uppercase identifiers after AS)
    const parts = rawLine.split(/\bAS\b/i);
    // Uppercase function-like tokens in the left part(s)
    const left = parts[0].replace(funcRegex, (m, fn) => {
      // Don't uppercase keywords like 'LOAD' which are not function calls followed by '(' — this is a heuristic
      if (/^\s*(LOAD|FROM|WHERE|JOIN|RESIDENT|STORE|DROP|IF|CASE)$/i.test(fn)) return fn.toUpperCase() + '(';
      // Uppercase detected function name
      if (fn !== fn.toUpperCase()) upperFuncApplied = true;
      return fn.toUpperCase() + '(';
    });

    // Re-join AS parts preserving original RHS case
    if (parts.length > 1) {
      return left + ' AS ' + parts.slice(1).join(' AS ');
    }

    return left;
  });

  if (upperFuncApplied) {
    actions.push({ id: 'upper-func', description: 'Uppercased function names', applied: true, risk: 'low' });
  }

  // 2) Align AS vertically when multiple AS lines present
  const asLinesIdx: number[] = [];
  transformedLines.forEach((l, idx) => { if (/\b AS \b/i.test(l)) asLinesIdx.push(idx); });

  let aligned = false;
  if (asLinesIdx.length > 1) {
    // compute column position for AS in each line
    const positions = asLinesIdx.map(i => transformedLines[i].toUpperCase().indexOf(' AS '));
    const maxPos = Math.max(...positions);
    for (const i of asLinesIdx) {
      const line = transformedLines[i];
      const curPos = line.toUpperCase().indexOf(' AS ');
      if (curPos !== maxPos) {
        // pad spaces before AS to align
        const before = line.slice(0, curPos);
        const after = line.slice(curPos + 4);
        transformedLines[i] = before.padEnd(maxPos, ' ') + ' AS ' + after;
        aligned = true;
      }
    }
  }

  if (aligned) actions.push({ id: 'align-as', description: 'Aligned AS keywords', applied: true, risk: 'low' });

  // 3) Basic indentation for LOAD/IF/END IF and similar constructs: 4 spaces
  let indentLevel = 0;
  const indentedLines = transformedLines.map((l) => {
    const trim = l.trim();
    const upper = trim.toUpperCase();

    // Decrease indent on END IF
    if (/^END\s+IF/i.test(trim)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const pref = upper.startsWith('LOAD') || upper.startsWith('IF') || upper.startsWith('FOR') || upper.startsWith('LEFT JOIN') || upper.startsWith('JOIN') ? '    '.repeat(indentLevel) : '    '.repeat(indentLevel + (upper.startsWith('LOAD') ? 0 : 0));

    let out = pref + trim;

    // Increase indent after IF or LOAD body lines
    if (/^IF\b/i.test(trim) || /^LOAD\b/i) {
      indentLevel += 1;
    }

    return out;
  });

  // If indentation algorithm touched lines, report action
  if (indentedLines.some((l, i) => l !== transformedLines[i])) {
    actions.push({ id: 'indent', description: 'Applied 4-space indentation', applied: true, risk: 'low' });
  }

  const formatted = indentedLines.join('\n');

  return { formatted, actions };
}

export async function formatWithProgress(script: string, opts?: { onProgress?: (p: number, m?: string) => void }): Promise<{ formattedScript: string; styleNotes: string[]; provider: 'local'; actions: FormatterAction[] }> {
  const onProgress = opts?.onProgress;

  onProgress?.(10, 'Parsing');
  await new Promise(res => setTimeout(res, 8));

  onProgress?.(30, 'Applying rules');
  await new Promise(res => setTimeout(res, 8));

  const { formatted, actions } = applyLocalAdvancedFormatting(script);

  onProgress?.(70, 'Finalizing');
  await new Promise(res => setTimeout(res, 8));

  onProgress?.(100, 'Done');

  const styleNotes = actions.map(a => a.description);

  return { formattedScript: formatted, styleNotes, provider: 'local', actions };
}
