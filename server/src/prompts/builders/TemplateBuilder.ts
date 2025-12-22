/**
 * AINEX Prompt Builders - TemplateBuilder
 * 
 * Fluent API for constructing LLM prompts with reusable components.
 * Eliminates duplication by composing sections dynamically.
 * 
 * @module prompts/builders/TemplateBuilder
 */

import { formatExamplesSection, type ExampleId } from '../components/examples';
import { formatLimits, type TaskLimits } from '../components/limits';
import { CORE_RULES, formatRule, type RuleId } from '../components/rules';
import { AINEX_IDENTITY, DESIGN_PATTERNS, OUTPUT_RULES } from '../core';

export interface TemplateSection {
  id: string;
  content: string;
  weight: number;  // For ordering: lower = earlier
}

export class TemplateBuilder {
  private sections: TemplateSection[] = [];

  constructor(_taskName: string = 'unnamed_task') {
    // taskName stored for future use
  }

  /**
   * Add AINEX identity section
   */
  withIdentity(): this {
    this.sections.push({
      id: 'identity',
      content: AINEX_IDENTITY,
      weight: 0
    });
    return this;
  }

  /**
   * Set task-specific context
   */
  withContext(context: string): this {
    this.sections.push({
      id: 'context',
      content: `## TASK CONTEXT\n\n${context}`,
      weight: 10
    });
    return this;
  }

  /**
   * Add core rules section
   */
  withRules(ruleIds?: RuleId[]): this {
    const rules = ruleIds
      ? ruleIds.map(id => CORE_RULES[id])
      : Object.values(CORE_RULES);

    const content = [
      '## CRITICAL RULES',
      '',
      ...rules.map(r => formatRule(r, true))
    ].join('\n');

    this.sections.push({
      id: 'rules',
      content,
      weight: 20
    });

    return this;
  }

  /**
   * Add design patterns section
   */
  withDesignPatterns(): this {
    this.sections.push({
      id: 'design-patterns',
      content: `## MANDATORY DESIGN PATTERNS\n\n${DESIGN_PATTERNS}`,
      weight: 25
    });
    return this;
  }

  /**
   * Add code examples section
   */
  withExamples(exampleIds: ExampleId[]): this {
    const content = formatExamplesSection(exampleIds);

    if (content) {
      this.sections.push({
        id: 'examples',
        content,
        weight: 30
      });
    }

    return this;
  }

  /**
   * Add task-specific instructions
   */
  withInstructions(instructions: string): this {
    this.sections.push({
      id: 'instructions',
      content: `## INSTRUCTIONS\n\n${instructions}`,
      weight: 40
    });
    return this;
  }

  /**
   * Add input data section
   */
  withInput(label: string, data: string): this {
    this.sections.push({
      id: 'input',
      content: `## ${label.toUpperCase()}\n\n${data}`,
      weight: 50
    });
    return this;
  }

  /**
   * Add JSON schema constraints
   */
  withSchema(schemaName: string, limits: TaskLimits): this {
    const content = [
      '## OUTPUT FORMAT',
      '',
      `Return a JSON object matching schema: \`${schemaName}\``,
      '',
      OUTPUT_RULES,
      '',
      '**RESPONSE LIMITS:**',
      formatLimits(limits)
    ].join('\n');

    this.sections.push({
      id: 'schema',
      content,
      weight: 60
    });

    return this;
  }

  /**
   * Add custom section
   */
  withCustomSection(id: string, content: string, weight: number = 50): this {
    this.sections.push({ id, content, weight });
    return this;
  }

  /**
   * Build the final prompt
   */
  build(): string {
    // Sort sections by weight
    const sorted = [...this.sections].sort((a, b) => a.weight - b.weight);

    // Join with double newlines
    return sorted.map(s => s.content).join('\n\n');
  }

  /**
   * Get token estimate (rough)
   */
  estimateTokens(): number {
    const text = this.build();
    // Rough estimate: 4 chars = 1 token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Factory function for common template patterns
 */
export function createOptimizationTemplate(
  taskName: string,
  includeExamples = true
): TemplateBuilder {
  const builder = new TemplateBuilder(taskName)
    .withIdentity()
    .withRules()
    .withDesignPatterns();

  if (includeExamples) {
    builder.withExamples([
      'INCOMPLETE_LOAD',
      'INCOMPLETE_SQL',
      'BARE_FIELD_LIST'
    ]);
  }

  return builder;
}
