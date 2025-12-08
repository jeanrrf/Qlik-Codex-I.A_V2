/**
 * ROI Calculator - Qlik Codex I.A Business Value Engine
 * 
 * Converte métricas técnicas em valor monetário para justificar investimento
 * em otimização de scripts Qlik.
 * 
 * REVENUE FEATURE: Esta é a killer feature para vendas enterprise.
 */

import { config } from '../lib/config';
import { OptimizeResult, MetricsEstimate, OptimizeChange } from '../types/qlik';

export interface ROICalculation {
  // Economias mensais (R$)
  monthly: {
    reloadTimeSavings: number;
    ramCostSavings: number;
    cpuCostSavings: number;
    storageSavings: number;
    developerTimeSavings: number;
    incidentReductionSavings: number;
    total: number;
  };

  // Economias anuais (R$)
  annual: {
    total: number;
    breakdown: {
      infrastructure: number;  // Cloud costs
      humanResources: number;  // Dev time
      incidents: number;       // Downtime/bugs
    };
  };

  // Métricas de impacto
  impact: {
    reloadTimeMinutesSaved: number;
    ramGBSaved: number;
    cpuCoresSaved: number;
    developerHoursSaved: number;
    complexityReductionPoints: number;
    locReduced: number;
  };

  // Payback period
  payback: {
    investmentHours: number;        // Horas investidas em otimização
    investmentCost: number;         // R$ custo da otimização
    monthsToPayback: number;        // Meses para retorno
    roi: number;                    // % ROI anual
  };

  // Confidence level
  confidence: 'low' | 'medium' | 'high';
  notes: string[];
}

/**
 * Calcula ROI baseado em métricas técnicas + parâmetros de negócio
 */
export function calculateROI(result: OptimizeResult): ROICalculation {
  const metrics = result.analysis.metricsEstimate;
  const changes = result.analysis.changes;
  const businessConfig = config.businessMetrics;

  // === IMPACT ANALYSIS ===

  // 1. Reload Time Savings (baseado em complexidade e otimizações de JOIN/LOAD)
  const performanceChanges = changes.filter(c => c.category === 'performance').length;
  const complexityImprovement = getComplexityDelta(metrics);
  const maintainabilityImprovement = getMaintainabilityDelta(metrics);

  // Valor base: qualquer otimização economiza pelo menos 0.5min
  const baseReloadSavings = changes.length > 0 ? 0.5 : 0;
  const reloadTimeMinutesSaved = Math.max(
    baseReloadSavings,
    performanceChanges * 2,  // 2 min por otimização de performance
    complexityImprovement * 0.5,  // 0.5 min por ponto de complexidade reduzida
    maintainabilityImprovement * 0.3  // 0.3 min por melhoria de maintainability
  );

  // 2. RAM Savings (baseado em LOAD *, campos removidos, estrutura)
  const loadStarChanges = changes.filter(c =>
    c.impact.toLowerCase().includes('load *') ||
    c.impact.toLowerCase().includes('select *') ||
    c.impact.toLowerCase().includes('campo')
  ).length;
  // Qualquer otimização estrutural reduz footprint de memória
  const structuralImpact = changes.filter(c => c.category === 'structure').length;
  const ramGBSaved = loadStarChanges * 0.2 + (complexityImprovement * 0.05) + (structuralImpact * 0.03);

  // 3. CPU Savings (baseado em joins otimizados, loops removidos)
  const structuralChanges = changes.filter(c =>
    c.category === 'structure' ||
    c.impact.toLowerCase().includes('join')
  ).length;
  const cpuCoresSaved = structuralChanges * 0.1;

  // 4. Developer Time Savings (baseado em complexidade e maintainability)
  const locReduced = extractLOCDelta(changes);

  // Qualquer melhoria de readability/structure economiza tempo de dev
  const readabilityChanges = changes.filter(c =>
    c.category === 'readability' || c.category === 'structure'
  ).length;
  const baseDeveloperSavings = readabilityChanges > 0 ? 1 : 0; // 1h base

  const developerHoursSaved =
    baseDeveloperSavings +
    (complexityImprovement * businessConfig.complexityReductionHoursPerCC) +
    (locReduced / 100 * businessConfig.locReductionMaintenanceHoursPer100) +
    (maintainabilityImprovement * 2) + // 2h por nível de maintainability
    (readabilityChanges * 0.5); // 0.5h por melhoria de readability

  // === COST CALCULATIONS ===

  // Monthly savings
  const reloadTimeSavings =
    reloadTimeMinutesSaved *
    businessConfig.monthlyReloadsAverage *
    businessConfig.reloadTimeValuePerMinute;

  const ramCostSavings = ramGBSaved * businessConfig.cloudRAMCostPerGBMonth;
  const cpuCostSavings = cpuCoresSaved * businessConfig.cloudCPUCostPerCoreMonth;
  const storageSavings = ramGBSaved * 0.5 * businessConfig.cloudStorageCostPerGBMonth; // QVD size reduction

  const developerTimeSavings = developerHoursSaved * businessConfig.developerHourlyRate;

  // Incident reduction (scripts mais simples = menos bugs)
  const incidentReductionSavings =
    (complexityImprovement > 10 ? 1 : 0) *
    businessConfig.averageIncidentCostPerHour *
    0.5; // Redução estimada de 50% em incidentes

  const monthlyTotal =
    reloadTimeSavings +
    ramCostSavings +
    cpuCostSavings +
    storageSavings +
    developerTimeSavings +
    incidentReductionSavings;

  // Annual projections
  const annualTotal = monthlyTotal * 12;
  const annualInfrastructure = (reloadTimeSavings + ramCostSavings + cpuCostSavings + storageSavings) * 12;
  const annualHumanResources = developerTimeSavings * 12;
  const annualIncidents = incidentReductionSavings * 12;

  // === PAYBACK ANALYSIS ===

  // Estimate investment (hours to optimize + review)
  const investmentHours = Math.max(2, changes.length * 0.5 + 2); // Min 2h, +0.5h per change
  const investmentCost = investmentHours * businessConfig.developerHourlyRate;
  const monthsToPayback = monthlyTotal > 0 ? investmentCost / monthlyTotal : 999;
  const roi = monthlyTotal > 0 ? ((annualTotal - investmentCost) / investmentCost) * 100 : 0;

  // === CONFIDENCE LEVEL ===
  const confidence = getConfidenceLevel(result, performanceChanges, complexityImprovement);

  // === NOTES ===
  const notes: string[] = [];
  if (reloadTimeMinutesSaved > 5) {
    notes.push(`Reload otimizado em ~${reloadTimeMinutesSaved.toFixed(1)} minutos - impacto alto em ambientes com reloads frequentes`);
  }
  if (ramGBSaved > 0.5) {
    notes.push(`Redução estimada de ${ramGBSaved.toFixed(2)}GB RAM - considere downgrade de instância cloud`);
  }
  if (complexityImprovement > 10) {
    notes.push(`Complexidade reduzida significativamente (${complexityImprovement} pontos) - menor risco de bugs em produção`);
  }
  if (developerHoursSaved > 10) {
    notes.push(`${developerHoursSaved.toFixed(1)}h/mês economizadas em manutenção - equipe pode focar em features`);
  }
  if (monthsToPayback < 1) {
    notes.push(`ROI imediato: investimento retorna em menos de 1 mês!`);
  }
  if (notes.length === 0) {
    notes.push('Otimizações aplicadas melhoram qualidade do código com impacto financeiro moderado');
  }

  return {
    monthly: {
      reloadTimeSavings,
      ramCostSavings,
      cpuCostSavings,
      storageSavings,
      developerTimeSavings,
      incidentReductionSavings,
      total: monthlyTotal
    },
    annual: {
      total: annualTotal,
      breakdown: {
        infrastructure: annualInfrastructure,
        humanResources: annualHumanResources,
        incidents: annualIncidents
      }
    },
    impact: {
      reloadTimeMinutesSaved,
      ramGBSaved,
      cpuCoresSaved,
      developerHoursSaved,
      complexityReductionPoints: complexityImprovement,
      locReduced
    },
    payback: {
      investmentHours,
      investmentCost,
      monthsToPayback,
      roi
    },
    confidence,
    notes
  };
}

/**
 * Gera executive summary em formato texto para relatórios
 */
export function formatROIExecutiveSummary(roi: ROICalculation): string {
  const monthlyFormatted = roi.monthly.total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const annualFormatted = roi.annual.total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const roiPercent = roi.payback.roi.toFixed(0);
  const paybackMonths = roi.payback.monthsToPayback.toFixed(1);

  return `
╔══════════════════════════════════════════════════════════════════╗
║  💰 VALOR DE NEGÓCIO - QLIK CODEX I.A                            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  📊 ECONOMIA MENSAL ESTIMADA: ${monthlyFormatted.padEnd(32)} ║
║  📈 ECONOMIA ANUAL PROJETADA: ${annualFormatted.padEnd(32)} ║
║                                                                  ║
║  ⏱️  Reload otimizado:     ${roi.impact.reloadTimeMinutesSaved.toFixed(1)} min/execução               ║
║  💾 RAM economizada:       ${roi.impact.ramGBSaved.toFixed(2)} GB                       ║
║  🧑‍💻 Tempo dev economizado: ${roi.impact.developerHoursSaved.toFixed(1)} h/mês                  ║
║  📉 Complexidade reduzida: ${roi.impact.complexityReductionPoints} pontos CC                 ║
║                                                                  ║
║  💵 ROI: ${roiPercent}% ao ano | Payback: ${paybackMonths} meses                    ║
║  ✅ Confiança: ${roi.confidence.toUpperCase().padEnd(6)}                                    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

📋 NOTAS EXECUTIVAS:
${roi.notes.map((n, i) => `   ${i + 1}. ${n}`).join('\n')}

💡 RECOMENDAÇÃO: ${roi.payback.monthsToPayback < 3
      ? 'Aplicar imediatamente - ROI rápido garantido'
      : roi.payback.monthsToPayback < 12
        ? 'Priorizar em roadmap - retorno garantido no ano'
        : 'Avaliar contexto - benefícios qualitativos significativos'}
`;
}

// === HELPER FUNCTIONS ===

function getComplexityDelta(metrics: MetricsEstimate): number {
  const before = metrics?.loadComplexityBefore || 'medium';
  const after = metrics?.loadComplexityAfter || 'medium';
  const levels = { low: 1, medium: 5, high: 15 };
  return Math.max(0, (levels[before as keyof typeof levels] || 5) - (levels[after as keyof typeof levels] || 5));
}

function getMaintainabilityDelta(metrics: MetricsEstimate): number {
  const before = metrics?.maintainabilityBefore || 'medium';
  const after = metrics?.maintainabilityAfter || 'medium';
  const levels = { low: 1, medium: 2, high: 3, excellent: 4, good: 3 };
  return Math.max(0, (levels[after as keyof typeof levels] || 2) - (levels[before as keyof typeof levels] || 2));
}

function extractLOCDelta(changes: OptimizeChange[]): number {
  let total = 0;
  for (const change of changes) {
    const match = String(change.impact || '').match(/LOC\s*[-+]?\s*(\d+)/i);
    if (match) {
      total += parseInt(match[1], 10);
    }
  }
  return total;
}

function getConfidenceLevel(
  result: OptimizeResult,
  performanceChanges: number,
  complexityImprovement: number
): 'low' | 'medium' | 'high' {
  // High confidence: Many changes + measurable improvements + low risk
  if (
    result.analysis.changes.length >= 5 &&
    performanceChanges >= 2 &&
    complexityImprovement >= 5 &&
    result.analysis.breakingRisk !== 'high'
  ) {
    return 'high';
  }

  // Medium confidence: Some changes + some improvements
  if (
    result.analysis.changes.length >= 2 &&
    (performanceChanges >= 1 || complexityImprovement >= 2)
  ) {
    return 'medium';
  }

  // Low confidence: Few changes or mostly cosmetic
  // Mas ainda assim valoriza melhoria de qualidade
  return 'low';
}
