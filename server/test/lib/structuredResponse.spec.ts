import { describe, it, expect } from 'vitest';
import { extractJsonFromText } from '../../src/lib/structuredResponse';

describe('structuredResponse.extractJsonFromText', () => {
  it('parses plain JSON string', () => {
    const s = '{"foo":"bar","num":123}';
    const out = extractJsonFromText(s);
    expect(out).toEqual({ foo: 'bar', num: 123 });
  });

  it('parses JSON inside code fences', () => {
    const s = 'Here is the result:\n```json\n{"foo":"bar"}\n```';
    const out = extractJsonFromText(s);
    expect(out).toEqual({ foo: 'bar' });
  });

  it('parses JSON with escaped newlines', () => {
    const s = '{\"foo\": \"line1\\nline2\"}';
    const out = extractJsonFromText(s);
    expect(out).toEqual({ foo: 'line1\nline2' });
  });

  it('parses JSON with trailing commas (tolerant mode)', () => {
    const s = '{"foo":"bar",}';
    const out = extractJsonFromText(s);
    expect(out).toEqual({ foo: 'bar' });
  });

  it('parses JSON embedded in markdown text', () => {
    const s = 'Aqui está o resultado otimizado:\n\n```json\n{"optimizedScript": "LOAD a;"}\n```\n\nEspero que ajude!';
    const out = extractJsonFromText(s);
    expect(out).toEqual({ optimizedScript: 'LOAD a;' });
  });

  it('parses JSON with unquoted keys (tolerant mode)', () => {
    const s = '{foo: "bar", num: 123}';
    const out = extractJsonFromText(s);
    expect(out).toEqual({ foo: 'bar', num: 123 });
  });

  it('fails to parse non-JSON despite heuristics', () => {
    const s = 'This is not JSON at all';
    expect(() => extractJsonFromText(s)).toThrow();
  });
});
