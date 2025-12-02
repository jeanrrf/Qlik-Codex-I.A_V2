/**
 * Qlik Codex I.A - Tipos de Consultoria
 * Sistema de documento de consultoria profissional
 */

export type ConsultancyPhase =
  | 'ingestion'
  | 'validation'
  | 'analysis'
  | 'optimization'
  | 'review'
  | 'documentation'
  | 'delivery';

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

export interface PhaseTrace {
  phase: ConsultancyPhase;
  status: PhaseStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  messages: string[];
  metrics?: Record<string, number | string>;
}

export interface TimelineEntry {
  timestamp: string;
  phase: ConsultancyPhase;
  action: string;
  detail?: string;
  icon: string;
}

export interface CodeMarker {
  lineStart: number;
  lineEnd: number;
  type: 'improvement' | 'warning' | 'removed' | 'added' | 'modified';
  description: string;
  category: 'performance' | 'readability' | 'cleanup' | 'structure' | 'security';
}

export interface CodeComparison {
  originalCode: string;
  optimizedCode: string;
  markers: CodeMarker[];
  diffStats: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    totalOriginal: number;
    totalOptimized: number;
  };
}

export interface QualitativeGain {
  category: string;
  icon: string;
  title: string;
  description: string;
  beforeLevel: 'critical' | 'low' | 'medium' | 'good' | 'excellent';
  afterLevel: 'critical' | 'low' | 'medium' | 'good' | 'excellent';
  confidence: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  effort: 'minimal' | 'low' | 'medium' | 'high';
  impact: 'minimal' | 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface ExecutiveSummary {
  title: string;
  clientContext?: string;
  projectName?: string;
  analyst: string;
  date: string;
  overview: string;
  keyFindings: string[];
  criticalAlerts: string[];
  overallRisk: 'none' | 'low' | 'medium' | 'high';
  overallHealth: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  recommendedAction: 'apply' | 'review' | 'caution' | 'reject';
}

export interface ConsultancyDocument {
  // Meta
  id: string;
  version: string;
  generatedAt: string;
  processingTimeMs: number;

  // Execution Timeline
  timeline: TimelineEntry[];
  phases: PhaseTrace[];
  cronogram: {
    totalDuration: number;
    fastestPhase: ConsultancyPhase;
    slowestPhase: ConsultancyPhase;
  };

  // Executive Summary
  executiveSummary: ExecutiveSummary;

  // Code Analysis
  codeComparison: CodeComparison;

  // Gains & Metrics
  qualitativeGains: QualitativeGain[];

  // Recommendations
  recommendations: Recommendation[];

  // Tips & Best Practices
  tips: {
    icon: string;
    title: string;
    content: string;
    category: 'performance' | 'maintenance' | 'security' | 'best-practice';
  }[];

  // Full Documentation (Markdown)
  fullDocumentation: string;

  // Warnings & Notes
  warnings: string[];
  notes: string[];
}

export interface ConsultancyOptions {
  generateTimeline?: boolean;
  generateMarkers?: boolean;
  generateTips?: boolean;
  includeCodeComparison?: boolean;
  detailLevel?: 'minimal' | 'standard' | 'detailed' | 'comprehensive';
}
