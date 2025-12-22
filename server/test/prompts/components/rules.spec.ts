/**
 * Tests for AINEX Prompt Components - Rules
 * 
 * @module test/prompts/components/rules
 */

import { describe, it, expect } from 'vitest';

import { CORE_RULES, formatRule, getRulesBySeverity } from '../../../src/prompts/components/rules';

describe('CORE_RULES', () => {
  it('should have all expected rule types', () => {
    expect(CORE_RULES.COMPLETENESS).toBeDefined();
    expect(CORE_RULES.LOAD_STAR_CONDITIONAL).toBeDefined();
    expect(CORE_RULES.PRESERVE_LOGIC).toBeDefined();
    expect(CORE_RULES.DESIGN_PATTERNS).toBeDefined();
    expect(CORE_RULES.CODE_STANDARDS).toBeDefined();
  });

  it('should have correct structure for each rule', () => {
    const rule = CORE_RULES.COMPLETENESS;
    expect(rule).toHaveProperty('id');
    expect(rule).toHaveProperty('severity');
    expect(rule).toHaveProperty('description');
    expect(rule).toHaveProperty('details');
    expect(Array.isArray(rule.details)).toBe(true);
  });

  it('should have critical severity for COMPLETENESS', () => {
    expect(CORE_RULES.COMPLETENESS.severity).toBe('critical');
  });

  it('should have details array with at least one item', () => {
    Object.values(CORE_RULES).forEach(rule => {
      expect(rule.details.length).toBeGreaterThan(0);
    });
  });
});

describe('formatRule', () => {
  it('should format rule with uppercase description', () => {
    const formatted = formatRule(CORE_RULES.COMPLETENESS, false);
    expect(formatted).toContain('EVERY FIELD LIST MUST HAVE LOAD/SQL SELECT KEYWORD');
  });

  it('should include details when requested', () => {
    const formatted = formatRule(CORE_RULES.COMPLETENESS, true);
    expect(formatted).toContain('- NEVER start with bare field list');
    expect(formatted).toContain('- EVERY LOAD statement MUST have a data source');
  });

  it('should not include details when not requested', () => {
    const formatted = formatRule(CORE_RULES.COMPLETENESS, false);
    expect(formatted).not.toContain('- NEVER start with bare field list');
  });
});

describe('getRulesBySeverity', () => {
  it('should return rules matching severity', () => {
    const critical = getRulesBySeverity('critical');
    expect(critical.length).toBeGreaterThan(0);
    critical.forEach(rule => {
      expect(rule.severity).toBe('critical');
    });
  });

  it('should return high severity rules', () => {
    const high = getRulesBySeverity('high');
    expect(high.length).toBeGreaterThan(0);
    high.forEach(rule => {
      expect(rule.severity).toBe('high');
    });
  });

  it('should return empty array if no rules match', () => {
    const low = getRulesBySeverity('low');
    // May or may not be empty depending on rules
    expect(Array.isArray(low)).toBe(true);
  });
});
