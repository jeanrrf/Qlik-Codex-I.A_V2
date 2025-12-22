/**
 * AINEX Prompt Components - Template Limits
 * 
 * Centralized configuration for all template constraints.
 * Makes it easy to adjust limits without touching template code.
 * 
 * @module prompts/components/limits
 */

export interface TaskLimits {
  maxArrayItems?: number;
  maxResponseChars?: number;
  maxStringLength?: number;
}

export const TEMPLATE_LIMITS = {
  analysis: {
    maxBottlenecks: 6,
    maxDataModelRisks: 6,
    maxOpportunities: 6,
    maxPlanSteps: 8,
    maxResponseChars: 2800
  },

  codeGen: {
    maxChanges: 8,
    maxResponseChars: 2800  // excluding script itself
  },

  finalDelivery: {
    maxIssues: 4,
    maxImprovements: 4,
    maxChecklistItems: 4,
    maxSummaryChars: 600
  },

  documentation: {
    maxTables: 20,
    maxFieldsPerTable: 50,
    maxMetrics: 10
  },

  formatOnly: {
    maxNotes: 10
  },

  nvidiaFast: {
    maxChanges: 8,
    maxSummaryChars: 400
  },

  // Global limits applied to all templates
  global: {
    maxArrayItems: 8,
    maxResponseChars: 2800
  }
} as const;

/**
 * Get limits for a specific task
 */
export function getLimits(taskId: string): TaskLimits {
  const taskLimits = TEMPLATE_LIMITS[taskId as keyof typeof TEMPLATE_LIMITS];

  if (!taskLimits) {
    return TEMPLATE_LIMITS.global;
  }

  return {
    ...TEMPLATE_LIMITS.global,
    ...taskLimits
  };
}

/**
 * Format limits as human-readable text
 */
export function formatLimits(limits: TaskLimits): string {
  const lines: string[] = [];

  if (limits.maxArrayItems) {
    lines.push(`- Maximum ${limits.maxArrayItems} items in arrays`);
  }

  if (limits.maxResponseChars) {
    lines.push(`- Response under ${limits.maxResponseChars} characters`);
  }

  if (limits.maxStringLength) {
    lines.push(`- String fields max ${limits.maxStringLength} characters`);
  }

  return lines.join('\n');
}
