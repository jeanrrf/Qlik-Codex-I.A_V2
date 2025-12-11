export function extractJsonFromText(text: string): Record<string, unknown> {
  if (!text || typeof text !== 'string') throw new Error('Empty response');

  // 1) Strip common fences and wrappers
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, '');
  s = s.replace(/\s*```$/i, '');

  // 2) Try to locate a JSON object by finding first { and the matching }
  const firstBrace = s.indexOf('{');
  if (firstBrace >= 0) {
    // Find matching closing brace by scanning and counting
    let depth = 0;
    for (let i = firstBrace; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) {
        const candidate = s.substring(firstBrace, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          return parsed;
        } catch (_e) {
          // continue to other strategies
        }
      }
    }
  }

  // 3) If no braces or parsing failed, attempt to recover simple escaped JSON
  // Replace common \n sequences into real newlines and try parse whole string
  const unescaped = s.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  try {
    return JSON.parse(unescaped);
  } catch (_e) {
    // continue
  }

  // 4) Try to extract a substring between the first { and last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const candidate = s.substring(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch (_e) {
      // continue
    }
  }

  // 5) As a last resort, attempt to fix common issues: wrap bare keys with quotes
  // This is risky; do minimal transformations: convert unquoted keys like key: to "key":
  // Only run a conservative regex replacement
  const safeFix = s.replace(/([,{\s])(\w[\w\d_]*)\s*:/g, '$1"$2":');
  try {
    return JSON.parse(safeFix);
  } catch (e) {
    throw new Error('Unable to extract JSON from response: ' + String(e));
  }
}
