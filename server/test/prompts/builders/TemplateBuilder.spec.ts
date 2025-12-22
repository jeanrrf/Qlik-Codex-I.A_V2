/**
 * Tests for AINEX Prompt Builders - TemplateBuilder
 * 
 * @module test/prompts/builders/TemplateBuilder
 */

import { describe, it, expect } from 'vitest';

import { TemplateBuilder, createOptimizationTemplate } from '../../../src/prompts/builders/TemplateBuilder';

describe('TemplateBuilder', () => {
  it('should create empty template by default', () => {
    const builder = new TemplateBuilder();
    const template = builder.build();
    expect(template).toBe('');
  });

  it('should add identity section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withIdentity().build();
    expect(template).toContain('AINEX');
  });

  it('should add context section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withContext('Test context').build();
    expect(template).toContain('Test context');
  });

  it('should add rules section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withRules().build();
    expect(template).toContain('CRITICAL RULES');
  });

  it('should add design patterns section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withDesignPatterns().build();
    expect(template).toContain('DESIGN PATTERNS');
  });

  it('should add examples section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withExamples(['INCOMPLETE_LOAD']).build();
    expect(template).toContain('COMMON MISTAKES');
  });

  it('should add instructions section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withInstructions('Do this and that').build();
    expect(template).toContain('Do this and that');
  });

  it('should add custom section', () => {
    const builder = new TemplateBuilder();
    const template = builder.withCustomSection('test', 'Custom content', 50).build();
    expect(template).toContain('Custom content');
  });

  it('should order sections by weight', () => {
    const builder = new TemplateBuilder();
    const template = builder
      .withCustomSection('last', 'Last section', 100)
      .withCustomSection('first', 'First section', 1)
      .withCustomSection('middle', 'Middle section', 50)
      .build();

    const firstIndex = template.indexOf('First section');
    const middleIndex = template.indexOf('Middle section');
    const lastIndex = template.indexOf('Last section');

    expect(firstIndex).toBeLessThan(middleIndex);
    expect(middleIndex).toBeLessThan(lastIndex);
  });

  it('should estimate tokens correctly', () => {
    const builder = new TemplateBuilder();
    builder.withContext('A'.repeat(400)); // 400 chars ≈ 100 tokens
    const estimate = builder.estimateTokens();
    expect(estimate).toBeGreaterThan(90);
    expect(estimate).toBeLessThan(110);
  });
});

describe('createOptimizationTemplate', () => {
  it('should create template with identity and rules', () => {
    const builder = createOptimizationTemplate('test');
    const template = builder.build();
    expect(template).toContain('AINEX');
    expect(template).toContain('CRITICAL RULES');
  });

  it('should include examples when requested', () => {
    const builder = createOptimizationTemplate('test', true);
    const template = builder.build();
    expect(template).toContain('COMMON MISTAKES');
  });

  it('should exclude examples when not requested', () => {
    const builder = createOptimizationTemplate('test', false);
    const template = builder.build();
    expect(template).not.toContain('COMMON MISTAKES');
  });

  it('should be chainable', () => {
    const builder = createOptimizationTemplate('test');
    const template = builder
      .withContext('Test optimization')
      .withInstructions('Apply all rules')
      .build();

    expect(template).toContain('Test optimization');
    expect(template).toContain('Apply all rules');
  });
});
