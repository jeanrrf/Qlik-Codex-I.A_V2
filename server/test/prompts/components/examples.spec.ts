/**
 * Tests for AINEX Prompt Components - Examples
 * 
 * @module test/prompts/components/examples
 */

import { describe, it, expect } from 'vitest';

import { CODE_EXAMPLES, formatExample, formatExamplesSection } from '../../../src/prompts/components/examples';

describe('CODE_EXAMPLES', () => {
  it('should have expected example types', () => {
    expect(CODE_EXAMPLES.INCOMPLETE_LOAD).toBeDefined();
    expect(CODE_EXAMPLES.INCOMPLETE_SQL).toBeDefined();
    expect(CODE_EXAMPLES.BARE_FIELD_LIST).toBeDefined();
  });

  it('should have correct structure', () => {
    const example = CODE_EXAMPLES.INCOMPLETE_LOAD;
    expect(example).toHaveProperty('id');
    expect(example).toHaveProperty('category');
    expect(example).toHaveProperty('title');
    expect(example).toHaveProperty('wrong');
    expect(example).toHaveProperty('correct');
    expect(example).toHaveProperty('explanation');
  });

  it('should have wrong and correct code snippets', () => {
    const example = CODE_EXAMPLES.INCOMPLETE_LOAD;
    expect(example.wrong).toContain('C7_FILIAL');
    expect(example.correct).toContain('LOAD');
    expect(example.correct).toContain('C7_FILIAL');
  });
});

describe('formatExample', () => {
  it('should format example with wrong and correct sections', () => {
    const formatted = formatExample(CODE_EXAMPLES.INCOMPLETE_LOAD);
    expect(formatted).toContain('WRONG');
    expect(formatted).toContain('CORRECT');
  });

  it('should include error icon for error category', () => {
    const formatted = formatExample(CODE_EXAMPLES.INCOMPLETE_LOAD);
    expect(formatted).toContain('❌');
  });

  it('should include success icon for correct section', () => {
    const formatted = formatExample(CODE_EXAMPLES.INCOMPLETE_LOAD);
    expect(formatted).toContain('✅');
  });
});

describe('formatExamplesSection', () => {
  it('should return empty string for empty array', () => {
    const formatted = formatExamplesSection([]);
    expect(formatted).toBe('');
  });

  it('should format multiple examples with header', () => {
    const formatted = formatExamplesSection(['INCOMPLETE_LOAD', 'INCOMPLETE_SQL']);
    expect(formatted).toContain('COMMON MISTAKES TO AVOID');
    expect(formatted).toContain('WRONG');
    expect(formatted).toContain('CORRECT');
    expect(formatted).toContain('C7_FILIAL'); // From INCOMPLETE_LOAD example
  });

  it('should handle single example', () => {
    const formatted = formatExamplesSection(['BARE_FIELD_LIST']);
    expect(formatted).toContain('COMMON MISTAKES TO AVOID');
    expect(formatted).toContain('WRONG');
    expect(formatted).toContain('CORRECT');
  });
});
