/**
 * Tests for AINEX Prompt Components - Limits
 * 
 * @module test/prompts/components/limits
 */

import { describe, it, expect } from 'vitest';

import { TEMPLATE_LIMITS, formatLimits, getLimits } from '../../../src/prompts/components/limits';

describe('TEMPLATE_LIMITS', () => {
  it('should have limits for all task types', () => {
    expect(TEMPLATE_LIMITS.analysis).toBeDefined();
    expect(TEMPLATE_LIMITS.codeGen).toBeDefined();
    expect(TEMPLATE_LIMITS.finalDelivery).toBeDefined();
    expect(TEMPLATE_LIMITS.documentation).toBeDefined();
    expect(TEMPLATE_LIMITS.formatOnly).toBeDefined();
    expect(TEMPLATE_LIMITS.nvidiaFast).toBeDefined();
    expect(TEMPLATE_LIMITS.global).toBeDefined();
  });

  it('should have numeric limits', () => {
    expect(typeof TEMPLATE_LIMITS.analysis.maxBottlenecks).toBe('number');
    expect(typeof TEMPLATE_LIMITS.codeGen.maxChanges).toBe('number');
    expect(typeof TEMPLATE_LIMITS.finalDelivery.maxIssues).toBe('number');
  });

  it('should have reasonable limit values', () => {
    expect(TEMPLATE_LIMITS.analysis.maxBottlenecks).toBeGreaterThan(0);
    expect(TEMPLATE_LIMITS.analysis.maxBottlenecks).toBeLessThan(100);
    expect(TEMPLATE_LIMITS.codeGen.maxChanges).toBeGreaterThan(0);
    expect(TEMPLATE_LIMITS.codeGen.maxChanges).toBeLessThan(100);
  });
});

describe('getLimits', () => {
  it('should return limits for known task', () => {
    const limits = getLimits('analysis');
    expect(limits).toBeDefined();
    expect(limits.maxArrayItems).toBe(TEMPLATE_LIMITS.global.maxArrayItems);
  });

  it('should return global limits for unknown task', () => {
    const limits = getLimits('unknown_task');
    expect(limits).toEqual(TEMPLATE_LIMITS.global);
  });

  it('should merge task limits with global limits', () => {
    const limits = getLimits('codeGen');
    expect(limits.maxArrayItems).toBe(TEMPLATE_LIMITS.global.maxArrayItems);
    expect(limits.maxResponseChars).toBe(TEMPLATE_LIMITS.codeGen.maxResponseChars);
  });
});

describe('formatLimits', () => {
  it('should format maxArrayItems', () => {
    const formatted = formatLimits({ maxArrayItems: 8 });
    expect(formatted).toContain('Maximum 8 items in arrays');
  });

  it('should format maxResponseChars', () => {
    const formatted = formatLimits({ maxResponseChars: 2800 });
    expect(formatted).toContain('Response under 2800 characters');
  });

  it('should handle multiple limits', () => {
    const formatted = formatLimits({ maxArrayItems: 8, maxResponseChars: 2800 });
    expect(formatted).toContain('Maximum 8 items');
    expect(formatted).toContain('Response under 2800 characters');
  });

  it('should return empty for no limits', () => {
    const formatted = formatLimits({});
    expect(formatted).toBe('');
  });
});
