import { logger } from './logger';

export function extractJsonFromText(text: string): Record<string, unknown> {
  if (!text || typeof text !== 'string') {
    logger.error('[structuredResponse] Empty or invalid text provided');
    throw new Error('Empty response');
  }

  logger.debug('[structuredResponse] Attempting to extract JSON from response', {
    textLength: text.length,
    preview: text.substring(0, 200)
  });

  // 1) Strip common fences and wrappers
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, '');
  s = s.replace(/\s*```$/i, '');
  // Remove all markdown fences that might wrap the JSON
  s = s.replace(/```json?\s*/gi, '').replace(/```\s*/gi, '');

  // 2) Try direct parse first (most common case)
  try {
    const parsed = JSON.parse(s);
    logger.debug('[structuredResponse] Successfully parsed JSON (direct strategy)');
    return parsed;
  } catch (e) {
    logger.debug('[structuredResponse] Direct parse failed, trying advanced strategies', {
      error: e instanceof Error ? e.message : String(e)
    });
    // continue to extraction strategies
  }

  // 3) Try to locate a JSON object by finding first { and the matching }
  const firstBrace = s.indexOf('{');
  if (firstBrace >= 0) {
    // Find matching closing brace by scanning and counting
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < s.length; i++) {
      const ch = s[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) {
        const candidate = s.substring(firstBrace, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          logger.debug('[structuredResponse] Successfully parsed JSON (brace-matching strategy)');
          return parsed;
        } catch (e) {
          logger.debug('[structuredResponse] Brace-matching parse failed', {
            error: e instanceof Error ? e.message : String(e)
          });
          // continue to other strategies
        }
        break;
      }
    }
  }

  // 4) If no braces or parsing failed, attempt to recover simple escaped JSON
  // Replace common \n sequences into real newlines and try parse whole string
  const unescaped = s.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  try {
    const parsed = JSON.parse(unescaped);
    logger.debug('[structuredResponse] Successfully parsed JSON (unescaping strategy)');
    return parsed;
  } catch (e) {
    logger.debug('[structuredResponse] Unescaping strategy failed', {
      error: e instanceof Error ? e.message : String(e)
    });
    // continue
  }

  // 5) Try to extract a substring between the first { and last }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const candidate = s.substring(first, last + 1);
    try {
      const parsed = JSON.parse(candidate);
      logger.debug('[structuredResponse] Successfully parsed JSON (first-last brace strategy)');
      return parsed;
    } catch (e) {
      logger.debug('[structuredResponse] First-last brace strategy failed, trying fixes', {
        error: e instanceof Error ? e.message : String(e)
      });
      // continue
    }
    // Try fixing common issues in the candidate
    const fixed = candidate
      .replace(/,\s*}/g, '}')  // trailing commas
      .replace(/,\s*]/g, ']')  // trailing commas in arrays
      .replace(/([,{\s])(\w[\w\d_]*)\s*:/g, '$1"$2":'); // unquoted keys
    try {
      const parsed = JSON.parse(fixed);
      logger.debug('[structuredResponse] Successfully parsed JSON (first-last brace + fixes strategy)');
      return parsed;
    } catch (e) {
      logger.debug('[structuredResponse] First-last brace + fixes strategy failed', {
        error: e instanceof Error ? e.message : String(e)
      });
      // continue
    }
  }

  // 6) As a last resort, attempt to fix common issues: wrap bare keys with quotes
  // This is risky; do minimal transformations: convert unquoted keys like key: to "key":
  // Only run a conservative regex replacement
  const safeFix = s.replace(/([,{\s])(\w[\w\d_]*)\s*:/g, '$1"$2":');
  try {
    const parsed = JSON.parse(safeFix);
    logger.debug('[structuredResponse] Successfully parsed JSON (safe-fix strategy)');
    return parsed;
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error('[structuredResponse] All extraction strategies failed', {
      error: errorMsg,
      textPreview: text.substring(0, 500)
    });
    throw new Error('Unable to extract JSON from response: ' + errorMsg);
  }
}
