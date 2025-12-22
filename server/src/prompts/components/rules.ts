/**
 * AINEX Prompt Components - Core Rules
 * 
 * Defines reusable validation rules for LLM prompts.
 * Each rule has ID, severity, description and detailed constraints.
 * 
 * @module prompts/components/rules
 */

export interface Rule {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  details: readonly string[];
}

export const CORE_RULES = {
  COMPLETENESS: {
    id: 'completeness',
    severity: 'critical',
    description: 'Every field list MUST have LOAD/SQL SELECT keyword',
    details: [
      'NEVER start with bare field list',
      'EVERY LOAD statement MUST have a data source (FROM, RESIDENT, INLINE, AUTOGENERATE, or SQL SELECT)',
      'DO NOT omit keywords like LOAD, SELECT, FROM, WHERE',
      'DO NOT generate partial code snippets or incomplete statements',
      'If you cannot complete a section safely, keep the original code'
    ]
  },

  LOAD_STAR_CONDITIONAL: {
    id: 'load-star',
    severity: 'high',
    description: 'LOAD * expansion is conditional on schema knowledge',
    details: [
      'IF explicit field list is provided → preserve it exactly',
      'IF LOAD * or SELECT * exists AND you know the schema (fields visible in context) → you MAY expand',
      'IF LOAD * or SELECT * exists BUT schema is UNKNOWN → KEEP AS-IS. Do NOT invent field names',
      'NEVER delete a LOAD block just because you cannot expand LOAD *',
      'When in doubt, preserve the original code'
    ]
  },

  PRESERVE_LOGIC: {
    id: 'preserve-logic',
    severity: 'critical',
    description: 'Preserve ALL business logic and identifiers',
    details: [
      'NEVER alter calculations, filters, or transformations',
      'NEVER translate or rename field names',
      'NEVER translate or rename table names',
      'NEVER change data model relationships',
      'All subroutines (SUB/END SUB) and mapping tables must be preserved'
    ]
  },

  DESIGN_PATTERNS: {
    id: 'design-patterns',
    severity: 'high',
    description: 'Apply AINEX Design Patterns (mandatory)',
    details: [
      'AS Alignment: Vertically align all AS keywords in each LOAD block',
      'TRACE Separators: Add block separators between logical sections'
    ]
  },

  CODE_STANDARDS: {
    id: 'code-standards',
    severity: 'medium',
    description: 'Follow Qlik code standards',
    details: [
      'Keywords in UPPERCASE (LOAD, FROM, WHERE, AS, LEFT JOIN, etc.)',
      'Proper indentation (4 spaces per level)',
      'DROP temporary tables after use',
      'Consistent naming conventions'
    ]
  }
} as const;

export type RuleId = keyof typeof CORE_RULES;

/**
 * Format a rule for inclusion in a prompt
 */
export function formatRule(rule: Rule, includeDetails = true): string {
  let output = `**${rule.description.toUpperCase()}**`;

  if (includeDetails && rule.details.length > 0) {
    output += '\n' + rule.details.map(d => `- ${d}`).join('\n');
  }

  return output;
}

/**
 * Get rules by severity level
 */
export function getRulesBySeverity(severity: Rule['severity']): Rule[] {
  return Object.values(CORE_RULES).filter(r => r.severity === severity);
}
