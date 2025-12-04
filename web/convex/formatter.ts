/**
 * Convex Actions - Qlik Formatter
 * Migrado de server/src/services/qlikFormatterService.ts
 */
import { action } from "./_generated/server";
import { v } from "convex/values";

// ==== FORMATTER LOCAL (sem LLM) ====

type FormatterAction = {
  id: string;
  description: string;
  applied: boolean;
  risk: 'low' | 'medium' | 'high';
};

function applyLocalAdvancedFormatting(script: string): { formatted: string; actions: FormatterAction[] } {
  const lines = script.replace(/\r\n/g, '\n').split('\n');
  const actions: FormatterAction[] = [];

  // 1) Uppercase function names (token before '(')
  const funcRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  let upperFuncApplied = false;

  const transformedLines = lines.map((rawLine) => {
    const parts = rawLine.split(/\bAS\b/i);
    const left = parts[0].replace(funcRegex, (m, fn) => {
      if (/^\s*(LOAD|FROM|WHERE|JOIN|RESIDENT|STORE|DROP|IF|CASE)$/i.test(fn)) return fn.toUpperCase() + '(';
      if (fn !== fn.toUpperCase()) upperFuncApplied = true;
      return fn.toUpperCase() + '(';
    });

    if (parts.length > 1) {
      return left + ' AS ' + parts.slice(1).join(' AS ');
    }
    return left;
  });

  if (upperFuncApplied) {
    actions.push({ id: 'upper-func', description: 'Uppercased function names', applied: true, risk: 'low' });
  }

  // 2) Align AS vertically
  const asLinesIdx: number[] = [];
  transformedLines.forEach((l, idx) => { if (/\b AS \b/i.test(l)) asLinesIdx.push(idx); });

  let aligned = false;
  if (asLinesIdx.length > 1) {
    const positions = asLinesIdx.map(i => transformedLines[i].toUpperCase().indexOf(' AS '));
    const maxPos = Math.max(...positions);
    for (const i of asLinesIdx) {
      const line = transformedLines[i];
      const curPos = line.toUpperCase().indexOf(' AS ');
      if (curPos !== maxPos) {
        const before = line.slice(0, curPos);
        const after = line.slice(curPos + 4);
        transformedLines[i] = before.padEnd(maxPos, ' ') + ' AS ' + after;
        aligned = true;
      }
    }
  }

  if (aligned) actions.push({ id: 'align-as', description: 'Aligned AS keywords', applied: true, risk: 'low' });

  // 3) Basic indentation
  let indentLevel = 0;
  const indentedLines = transformedLines.map((l) => {
    const trim = l.trim();
    const upper = trim.toUpperCase();

    if (/^END\s+IF/i.test(trim)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const pref = '    '.repeat(indentLevel);
    let out = pref + trim;

    if (/^IF\b/i.test(trim)) {
      indentLevel += 1;
    }

    return out;
  });

  if (indentedLines.some((l, i) => l !== transformedLines[i])) {
    actions.push({ id: 'indent', description: 'Applied 4-space indentation', applied: true, risk: 'low' });
  }

  const formatted = indentedLines.join('\n');
  return { formatted, actions };
}

// ==== CONVEX ACTION ====

export const formatScript = action({
  args: {
    script: v.string(),
  },
  handler: async (_ctx, args) => {
    const { formatted, actions } = applyLocalAdvancedFormatting(args.script);

    return {
      formattedScript: formatted,
      notes: actions.map(a => a.description),
      provider: 'local' as const,
      actions,
    };
  },
});
