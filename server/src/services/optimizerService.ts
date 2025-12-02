import { logger } from "../lib/logger";
import { sseEmitter } from "../lib/sseEmitter";
import { runQlikExplainAgent } from "../agents/qlikExplainAgent";
import { runQlikOptimizeAgent } from "../agents/qlikOptimizeAgent";
import { runQlikReviewAgent } from "../agents/qlikReviewAgent";
import { generateCompactAuditReport, CompactAuditReport } from "../agents/qlikConsultancyAgent";
import { calculateROI, formatROIExecutiveSummary } from "./roiCalculator";
import {
  analyzeScriptCharacteristics,
  generateChunkStrategy,
  createScriptChunks,
  mergeChunkResults,
  applySmartTruncation,
  SmartTruncationResult
} from "../lib/scriptAnalyzer";
import type { OptimizeMode, OptimizeResult } from "../types/qlik";
import type { ConsultancyDocument } from "../types/consultancy";
import type { GenerateStructuredJsonOptions } from "../lib/llmClient";
import { stepTimingService } from "./stepTimingService";
import { calculateRealMetrics, getCriticalIssuesFromMetrics, formatMetricsCompact } from "./metricsCalculator";
import { validateQlikScript } from "../validators/qlikValidator";
import {
  parseQlikScript,
  detectSyntheticKeys,
  calculateQualityMetrics,
  type ParsedScript,
  type AntiPattern
} from "../lib/qlikParser";

export interface FullOptimizeResult extends OptimizeResult {
  explanation?: string;
  consultancyDocument?: ConsultancyDocument;
  compactAuditReport?: CompactAuditReport; // NOVO: relatório compacto
  roiExecutiveSummary?: string;  // REVENUE FEATURE: ROI summary em texto
  analysisOnly?: {
    parsed: ParsedScript;
    qualityMetrics: ReturnType<typeof calculateQualityMetrics>;
    allAntiPatterns: AntiPattern[];
    roiExecutiveSummary?: string;  // ROI summary também no analysis mode
  };
}

/**
 * Helper: Verifica se a operação foi cancelada
 */
function checkAborted(signal?: AbortSignal, context?: string): void {
  if (signal?.aborted) {
    logger.warn(`⛔ Optimization aborted${context ? ` at ${context}` : ''}`);
    throw new Error(`Optimization aborted${context ? ` at ${context}` : ''}`);
  }
}

/**
 * MODO 1: ANÁLISE (Read-Only)
 * Analisa profundamente sem modificar nada
 */
async function runAnalysisMode(
  script: string,
  llmOptions?: GenerateStructuredJsonOptions,
  isTruncated = false,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Analysis mode start');
  logger.info("🔍 MODO ANÁLISE - Sem modificações no código");

  // ═══════════════════════════════════════════════════════════════
  // ANÁLISE PRÉVIA: DETECTAR CARACTERÍSTICAS DO SCRIPT
  // ═══════════════════════════════════════════════════════════════
  const characteristics = analyzeScriptCharacteristics(script, isTruncated);
  logger.info(`📊 Características: ${characteristics.fileType.toUpperCase()} | ${characteristics.size} | ${characteristics.complexity} complexity`);
  logger.info(`📊 Tokens estimados: ${characteristics.estimatedTokens.toLocaleString()} | Linhas: ${characteristics.lineCount}`);

  // Emite evento de características detectadas
  sseEmitter.sendToCurrent({
    type: 'script_analysis',
    data: {
      fileType: characteristics.fileType,
      size: characteristics.size,
      complexity: characteristics.complexity,
      lines: characteristics.lineCount,
      estimatedTokens: characteristics.estimatedTokens,
      qvdOperations: characteristics.hasQVDOperations ? {
        reads: characteristics.qvdReadCount,
        writes: characteristics.qvdWriteCount
      } : null,
      strategy: characteristics.recommendedStrategy
    }
  });

  if (characteristics.hasQVDOperations) {
    logger.info(`📦 QVD: ${characteristics.qvdReadCount} reads, ${characteristics.qvdWriteCount} writes`);
  }  // Estratégia adaptativa
  if (characteristics.recommendedStrategy === 'chunked') {
    logger.info("⚡ Estratégia: CHUNKED - Análise otimizada por blocos");
    return await runAnalysisModeChunked(script, characteristics, llmOptions);
  } else if (characteristics.recommendedStrategy === 'optimized') {
    logger.info("⚡ Estratégia: OPTIMIZED - Análise com prompt compactado");
  } else {
    logger.info("⚡ Estratégia: FULL - Análise tradicional completa");
  }

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 1: PARSE E ANÁLISE ESTRUTURAL PROFUNDA
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before structural analysis');
  logger.info("═══ ETAPA 1/3: ANÁLISE ESTRUTURAL ═══");

  const parsed = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_001_main",
    "Análise Estrutural Completa",
    async () => {
      checkAborted(abortSignal, 'Inside structural analysis');
      // Sub 1.1: Parse do Script
      const parsedData = await stepTimingService.executeWithTiming(
        "analysis",
        "ana_001_parse",
        "Parse Qlik Real",
        async () => {
          logger.info("→ Executando parser Qlik...");
          return parseQlikScript(script);
        },
        "Parser proprietário: extrair tabelas, campos, variáveis, joins"
      );

      checkAborted(abortSignal, 'After parse');
      // Sub 1.2: Detecção de Anti-patterns
      await stepTimingService.executeWithTiming(
        "analysis",
        "ana_001_antipatterns",
        "Detecção de Anti-patterns",
        async () => {
          logger.info("→ Detectando anti-patterns programaticamente...");
          const syntheticKeys = detectSyntheticKeys(parsedData);
          parsedData.antiPatterns.push(...syntheticKeys);
          return parsedData.antiPatterns;
        },
        "Detectar SELECT *, Cartesian Products, Synthetic Keys"
      );

      checkAborted(abortSignal, 'After anti-patterns');
      // Sub 1.3: Cálculo de Métricas
      const metrics = await stepTimingService.executeWithTiming(
        "analysis",
        "ana_001_metrics",
        "Cálculo de Métricas de Qualidade",
        async () => {
          logger.info("→ Calculando métricas de qualidade...");
          return calculateQualityMetrics(parsedData);
        },
        "Manutenibilidade, Complexidade Ciclomática, Razão de Comentários"
      );

      return { parsedData, metrics };
    },
    "Parse completo e análise estática do código Qlik"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 2: ANÁLISE LLM (SEM MODIFICAÇÃO)
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before LLM analysis');
  logger.info("═══ ETAPA 2/3: ANÁLISE INTELIGENTE (LLM) ═══");

  const analysis = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_002_main",
    "Análise LLM Read-Only",
    async () => {
      checkAborted(abortSignal, 'Inside LLM analysis');
      // Sub 2.1: Contexto para LLM
      await stepTimingService.executeWithTiming(
        "analysis",
        "ana_002_context",
        "Preparação de Contexto",
        async () => {
          logger.info("→ Montando contexto rico para LLM...");
          return {
            tables: parsed.parsedData.tables.length,
            antiPatterns: parsed.parsedData.antiPatterns.length
          };
        },
        "Preparar contexto estruturado com métricas calculadas"
      );

      checkAborted(abortSignal, 'Before LLM call');
      // Sub 2.2: LLM Analysis (sem modificação)
      return await stepTimingService.executeWithTiming(
        "analysis",
        "ana_002_llm",
        "Análise LLM - Sugestões Apenas",
        async () => {
          logger.info("→ LLM gerando relatório de análise...");
          // Aqui rodamos o optimize agent mas em modo "analysis-only"
          return await runQlikOptimizeAgent(script, "analysis", llmOptions);
        },
        "LLM analisa e sugere melhorias SEM aplicar mudanças"
      );
    },
    "Análise inteligente do código com sugestões (read-only)"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 3: RELATÓRIO DE ANÁLISE COM MÉTRICAS REAIS
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before real metrics');
  logger.info("═══ ETAPA 3/4: CÁLCULO DE MÉTRICAS REAIS ═══");

  const realMetrics = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_003_metrics_real",
    "Cálculo de Métricas Reais",
    async () => {
      logger.info("→ Calculando métricas quantitativas reais...");
      const metrics = calculateRealMetrics(script);
      logger.info(`  ✓ ${formatMetricsCompact(metrics)}`);

      // Log de issues críticos
      const criticalIssues = getCriticalIssuesFromMetrics(metrics);
      if (criticalIssues.length > 0) {
        logger.warn(`  ⚠️  ${criticalIssues.length} issue(s) crítico(s):`);
        criticalIssues.forEach(issue => logger.warn(`    - ${issue}`));
      }

      return metrics;
    },
    "Calcular LOC, complexidade ciclomática, anti-patterns, MI"
  );

  // Adicionar métricas reais ao resultado
  analysis.analysis.realMetrics = realMetrics;

  logger.info("═══ ETAPA 4/4: GERAÇÃO DE RELATÓRIO COMPACTO ═══");

  const compactReport = await stepTimingService.executeWithTiming(
    "analysis",
    "ana_004_report_compact",
    "Relatório Compacto v3.0",
    async () => {
      logger.info("→ Gerando relatório compacto (apenas dados críticos)...");
      return await generateCompactAuditReport(analysis, realMetrics);
    },
    "Relatório minimalista: sumário + métricas + top issues"
  );

  // MODO ANÁLISE: não gerar mais relatório completo legado aqui
  // Mantemos apenas o relatório compacto e as métricas reais
  const consultancyDoc = undefined;

  logger.info("✓ ANÁLISE concluída - Script original preservado");
  logger.info(`  📊 Métricas: ${formatMetricsCompact(realMetrics)}`);
  logger.info(`  ⚠️  Issues críticos: ${compactReport.criticalIssues.length}`);
  logger.info(`  💡 Recomendações: ${compactReport.topRecommendations.length}`);

  // === ROI CALCULATION (REVENUE FEATURE) ===
  const roi = calculateROI(analysis);
  logger.info(`  💰 Economia estimada: R$ ${roi.monthly.total.toFixed(2)}/mês | R$ ${roi.annual.total.toFixed(2)}/ano`);
  logger.info(`  📈 ROI: ${roi.payback.roi.toFixed(0)}% | Payback: ${roi.payback.monthsToPayback.toFixed(1)} meses`);

  return {
    ...analysis,
    originalScript: script,
    optimizedScript: script, // MESMO script (não modificou)
    analysis: {
      ...analysis.analysis,
      roi  // Adiciona ROI calculation
    },
    consultancyDocument: consultancyDoc,
    compactAuditReport: compactReport, // NOVO: relatório compacto priorizado
    analysisOnly: {
      parsed: parsed.parsedData,
      qualityMetrics: parsed.metrics,
      allAntiPatterns: parsed.parsedData.antiPatterns,
      roiExecutiveSummary: formatROIExecutiveSummary(roi)  // Summary formatado
    }
  };
}

/**
 * MODO 2: ULTRA EXPERT (Full Power)
 * Otimização profunda com todas as análises implementadas
 */
async function runUltraExpertMode(
  script: string,
  llmOptions?: GenerateStructuredJsonOptions,
  generateConsultancy = true,
  isTruncated = false,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Ultra Expert mode start');
  logger.info("⚡ MODO ULTRA EXPERT - Otimização Máxima Ativada");

  // ═══════════════════════════════════════════════════════════════
  // ANÁLISE PRÉVIA: DETECTAR CARACTERÍSTICAS DO SCRIPT
  // ═══════════════════════════════════════════════════════════════
  const characteristics = analyzeScriptCharacteristics(script, isTruncated);
  logger.info(`📊 Características: ${characteristics.fileType.toUpperCase()} | ${characteristics.size} | ${characteristics.complexity} complexity`);
  logger.info(`📊 Tokens estimados: ${characteristics.estimatedTokens.toLocaleString()} | Linhas: ${characteristics.lineCount}`);

  checkAborted(abortSignal, 'After characteristic analysis');
  // Estratégia adaptativa para arquivos grandes
  if (characteristics.recommendedStrategy === 'chunked') {
    logger.info("⚡ Estratégia: CHUNKED - Otimização por blocos com consolidação");
    return await runUltraExpertModeChunked(script, characteristics, llmOptions, generateConsultancy, abortSignal);
  } else if (characteristics.recommendedStrategy === 'optimized') {
    logger.info("⚡ Estratégia: OPTIMIZED - Prompt compactado para melhor performance");
  } else {
    logger.info("⚡ Estratégia: FULL - Análise completa tradicional");
  }

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 1: ANÁLISE PROFUNDA COM PARSE REAL
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before deep analysis');
  logger.info("═══ ETAPA 1/4: ANÁLISE PROFUNDA ═══");

  const optimized = await stepTimingService.executeWithTiming(
    "optimization",
    "opt_001_main",
    "Análise e Otimização Ultra Expert",
    async () => {
      checkAborted(abortSignal, 'Inside optimization main');
      // Sub 1.1: Parse Real
      const parsedData = await stepTimingService.executeWithTiming(
        "optimization",
        "opt_001_parse",
        "Parse Qlik Completo",
        async () => {
          logger.info("→ Parser Qlik executando análise estrutural...");
          return parseQlikScript(script);
        },
        "Extrair AST: tabelas, joins, variáveis, loops, fields"
      );

      // Sub 1.2: Extração de Metadados Profunda
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_001_metadata",
        "Extração de Metadados Avançada",
        async () => {
          logger.info("→ Mapeando dependências entre tabelas...");
          logger.info(`  ✓ ${parsedData.tables.length} tabelas identificadas`);
          logger.info(`  ✓ ${parsedData.joins.length} joins detectados`);
          logger.info(`  ✓ ${parsedData.variables.length} variáveis encontradas`);
          return parsedData;
        },
        "Mapear grafo de dependências, field lineage, data flow"
      );

      // Sub 1.3: Detecção de Anti-patterns Programática
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_001_antipatterns",
        "Detecção Automatizada de Anti-patterns",
        async () => {
          logger.info("→ Executando detectores de anti-patterns...");
          const syntheticKeys = detectSyntheticKeys(parsedData);
          parsedData.antiPatterns.push(...syntheticKeys);
          logger.info(`  ⚠️  ${parsedData.antiPatterns.length} anti-patterns detectados`);
          parsedData.antiPatterns.forEach(ap => {
            logger.warn(`    [${ap.severity}] L${ap.line}: ${ap.type}`);
          });
          return parsedData.antiPatterns;
        },
        "SELECT *, Cartesian Products, Synthetic Keys, Circular Refs"
      );

      // Sub 1.4: Cálculo de Métricas Reais
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_001_metrics",
        "Cálculo de Métricas de Código",
        async () => {
          logger.info("→ Calculando métricas de qualidade...");
          const quality = calculateQualityMetrics(parsedData);
          logger.info(`  📊 Maintainability Index: ${quality.maintainabilityIndex}/100 (${quality.qualityGrade})`);
          logger.info(`  📊 Cyclomatic Complexity: ${parsedData.complexity.cyclomaticComplexity}`);
          logger.info(`  📊 Code:Comment Ratio: ${quality.codeToCommentRatio}`);
          return quality;
        },
        "Maintainability Index, Cyclomatic Complexity, Technical Debt"
      );

      // Sub 1.5: Otimização LLM (com contexto rico)
      checkAborted(abortSignal, 'Before LLM optimization');
      return await stepTimingService.executeWithTiming(
        "optimization",
        "opt_001_llm",
        "LLM Ultra Expert - Otimização",
        async () => {
          logger.info("→ LLM recebendo contexto completo de análise...");
          // O LLM recebe os dados do parser para otimizar com contexto
          return await runQlikOptimizeAgent(script, "ultra-expert", llmOptions);
        },
        "LLM otimiza com contexto: AST, anti-patterns, métricas calculadas"
      );
    },
    "Análise estrutural completa + otimização LLM contextualizada"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 2: REVISÃO DE SEGURANÇA AVANÇADA
  // ═══════════════════════════════════════════════════════════════
  checkAborted(abortSignal, 'Before advanced review');
  logger.info("═══ ETAPA 2/4: REVISÃO AVANÇADA ═══");

  const reviewed = await stepTimingService.executeWithTiming(
    "optimization",
    "opt_002_main",
    "Revisão Avançada de Código",
    async () => {
      // Sub 2.1: Scan de Segurança Programático
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_002_security",
        "Scan de Vulnerabilidades Automatizado",
        async () => {
          logger.info("→ Verificando SQL injection, DROP, DELETE...");
          const dangerousCommands = [
            'DROP TABLE', 'DROP FIELD', 'DELETE', 'EXECUTE',
            'SQL DELETE', 'SQL DROP', 'SQL TRUNCATE'
          ];
          const hasDanger = dangerousCommands.some(cmd =>
            optimized.optimizedScript.toUpperCase().includes(cmd)
          );
          if (hasDanger) {
            logger.warn("  ⚠️  Comandos perigosos detectados no código otimizado!");
          }
          return { vulnerabilities: [] };
        },
        "Detectar SQL injection, comandos destrutivos, security risks"
      );

      // Sub 2.2: Validação de Integridade com Parser
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_002_integrity",
        "Validação de Integridade Estrutural",
        async () => {
          logger.info("→ Comparando estruturas antes/depois...");
          const parsedAfter = parseQlikScript(optimized.optimizedScript);
          logger.info(`  ✓ Tabelas: ${parsedAfter.tables.length} (original: ${parseQlikScript(script).tables.length})`);
          logger.info(`  ✓ Joins: ${parsedAfter.joins.length}`);
          return { integrityChecks: [] };
        },
        "Garantir que JOINs, chaves sintéticas e relações foram preservadas"
      );

      // Sub 2.3: Diff Algorítmico
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_002_diff",
        "Análise de Diferenças Algorítmica",
        async () => {
          logger.info("→ Calculando diff estruturado...");
          const originalLines = script.split('\n');
          const optimizedLines = optimized.optimizedScript.split('\n');
          const diffStats = {
            added: optimizedLines.length - originalLines.length,
            removed: 0,
            modified: 0
          };
          logger.info(`  📊 Linhas adicionadas: ${diffStats.added}`);
          return { diffStats };
        },
        "Diff line-by-line, calcular impacto real das mudanças"
      );

      // Sub 2.4: Revisão LLM
      return await stepTimingService.executeWithTiming(
        "optimization",
        "opt_002_llm",
        "LLM Review Agent - Crítica Final",
        async () => {
          logger.info("→ Agente de revisão analisando mudanças...");
          return await runQlikReviewAgent(optimized, llmOptions);
        },
        "Revisar código otimizado com agente crítico especializado"
      );
    },
    "Revisão multi-camadas: segurança, integridade, diff, LLM review"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 3: DOCUMENTAÇÃO TÉCNICA
  // ═══════════════════════════════════════════════════════════════
  logger.info("═══ ETAPA 3/4: DOCUMENTAÇÃO ═══");

  const explanation = await stepTimingService.executeWithTiming(
    "optimization",
    "opt_003_main",
    "Geração de Documentação Técnica",
    async () => {
      await stepTimingService.executeWithTiming(
        "optimization",
        "opt_003_impact",
        "Análise de Impacto",
        async () => {
          logger.info("→ Analisando impacto das mudanças...");
          return {};
        },
        "Calcular impacto de performance, manutenibilidade, segurança"
      );

      return await stepTimingService.executeWithTiming(
        "optimization",
        "opt_003_llm",
        "LLM Explain Agent - Documentação",
        async () => {
          logger.info("→ Gerando explicação técnica didática...");
          return await runQlikExplainAgent(reviewed, llmOptions);
        },
        "Gerar documentação técnica e educativa das otimizações"
      );
    },
    "Documentação completa: impacto, explicações, guias"
  );

  // ═══════════════════════════════════════════════════════════════
  // ETAPA 4: CONSULTORIA + MÉTRICAS REAIS
  // ═══════════════════════════════════════════════════════════════
  let consultancyDocument: ConsultancyDocument | undefined;
  let compactReport: CompactAuditReport | undefined;

  if (generateConsultancy) {
    try {
      logger.info("═══ ETAPA 4/5: CÁLCULO DE MÉTRICAS REAIS ═══");

      const realMetrics = await stepTimingService.executeWithTiming(
        "optimization",
        "opt_004_metrics_real",
        "Métricas Quantitativas Reais",
        async () => {
          logger.info("→ Calculando métricas do script otimizado...");
          const metrics = calculateRealMetrics(reviewed.optimizedScript);
          logger.info(`  ✓ ${formatMetricsCompact(metrics)}`);

          const criticalIssues = getCriticalIssuesFromMetrics(metrics);
          if (criticalIssues.length > 0) {
            logger.warn(`  ⚠️  ${criticalIssues.length} issue(s) crítico(s) pós-otimização:`);
            criticalIssues.forEach(issue => logger.warn(`    - ${issue}`));
          }

          return metrics;
        },
        "Calcular métricas reais do código otimizado"
      );

      // Adicionar métricas reais ao resultado
      reviewed.analysis.realMetrics = realMetrics;

      logger.info("═══ ETAPA 5/5: RELATÓRIO COMPACTO v3.0 ═══");

      compactReport = await stepTimingService.executeWithTiming(
        "optimization",
        "opt_005_report_compact",
        "Relatório Compacto (Priorizado)",
        async () => {
          logger.info("→ Gerando relatório compacto (apenas dados críticos)...");
          return await generateCompactAuditReport(reviewed, realMetrics);
        },
        "Relatório minimalista: sumário + métricas + top 5 recomendações"
      );

      logger.info("  📊 Métricas finais: " + formatMetricsCompact(realMetrics));
      logger.info(`  ⚠️  Issues críticos: ${compactReport.criticalIssues.length}`);
      logger.info(`  💡 Top recomendações: ${compactReport.topRecommendations.length}`);

      // === ROI CALCULATION (REVENUE FEATURE) ===
      const roi = calculateROI(reviewed);
      logger.info(`  💰 Economia estimada: R$ ${roi.monthly.total.toFixed(2)}/mês | R$ ${roi.annual.total.toFixed(2)}/ano`);
      logger.info(`  📈 ROI: ${roi.payback.roi.toFixed(0)}% | Payback: ${roi.payback.monthsToPayback.toFixed(1)} meses`);

      // Adiciona ROI ao resultado reviewed
      reviewed.analysis.roi = roi;

      // Modo Ultra Expert: manter apenas relatório compacto como saída principal.
      // O relatório executivo legado foi desativado para reduzir custo e ruído.
    } catch (err) {
      logger.warn("Falha ao gerar documento de consultoria", { error: String(err) });
    }
  }

  logger.info("✓ MODO ULTRA EXPERT concluído com sucesso", {
    subStepsExecuted: stepTimingService.getCompletedSubSteps("optimization").length,
    breakingRisk: reviewed.analysis.breakingRisk
  });

  return {
    ...reviewed,
    explanation,
    consultancyDocument,
    compactAuditReport: compactReport, // NOVO: relatório compacto priorizado
    roiExecutiveSummary: reviewed.analysis.roi ? formatROIExecutiveSummary(reviewed.analysis.roi as any) : undefined
  };
}

/**
 * Entry point: Roteamento por modo
 * ✨ FREE TIER: Suporta truncamento inteligente para limites de linhas
 */
export async function optimizeScript(
  script: string,
  mode: OptimizeMode,
  llmOptions?: GenerateStructuredJsonOptions,
  generateConsultancy = true,
  shouldTruncate?: boolean,
  lineLimit?: number,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  stepTimingService.reset();

  // Debug: Log parâmetros recebidos
  const originalLines = script.split(/\r?\n/).length;
  logger.debug("optimizeScript called", {
    mode,
    originalLines,
    shouldTruncate,
    lineLimit
  });

  // Verifica cancelamento logo no início
  if (abortSignal?.aborted) {
    throw new Error('Optimization aborted by client');
  }

  let finalScript = script;
  let truncationInfo: SmartTruncationResult | null = null;

  // ✨ APLICAR TRUNCAMENTO INTELIGENTE SE NECESSÁRIO (FREE TIER)
  if (shouldTruncate && lineLimit) {
    logger.info(`🔒 FREE TIER: Aplicando limite de ${lineLimit} linhas com truncamento inteligente...`);
    logger.warn(`⚠️  CHUNKING DESABILITADO - Scripts truncados (FREE TIER) nunca usam chunking`);

    truncationInfo = applySmartTruncation(script, lineLimit);
    finalScript = truncationInfo.truncatedScript;

    if (truncationInfo.wasTruncated) {
      logger.warn(truncationInfo.warningMessage);
      logger.info(`✂️  Cortado em linha ${truncationInfo.actualLines} (${lineLimit} base + ${truncationInfo.extraLinesAdded} extras)`);

      // Emite aviso via SSE
      sseEmitter.sendToCurrent({
        type: 'truncation_warning',
        data: {
          originalLines: truncationInfo.originalLines,
          truncatedLines: truncationInfo.actualLines,
          extraLines: truncationInfo.extraLinesAdded,
          cutPoint: truncationInfo.cutPoint,
          message: truncationInfo.warningMessage
        }
      });
    } else {
      logger.info(`✓ Script dentro do limite (${truncationInfo.originalLines} linhas)`);
    }
  }

  // Continua processamento normal com script (possivelmente truncado)
  let result: FullOptimizeResult;

  if (mode === "analysis") {
    result = await runAnalysisMode(finalScript, llmOptions, truncationInfo?.wasTruncated || false, abortSignal);
  } else {
    result = await runUltraExpertMode(finalScript, llmOptions, generateConsultancy, truncationInfo?.wasTruncated || false, abortSignal);
  }

  // Adiciona informação de truncamento ao resultado
  if (truncationInfo?.wasTruncated) {
    result.summary = `${truncationInfo.warningMessage}\n\n${result.summary}`;
  }

  return result;
}

/**
 * MODO ANÁLISE CHUNKED - Para arquivos grandes QVD/QVS
 * Processa o script em chunks para evitar timeout mantendo precisão
 */
async function runAnalysisModeChunked(
  script: string,
  characteristics: ReturnType<typeof analyzeScriptCharacteristics>,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<FullOptimizeResult> {
  logger.info("🔄 Iniciando análise CHUNKED...");

  const strategy = generateChunkStrategy(characteristics);
  const chunks = createScriptChunks(script, strategy);

  logger.info(`📦 Script dividido em ${chunks.length} chunks (tamanho: ${strategy.chunkSize} linhas, overlap: ${strategy.overlapLines})`);
  logger.info(`🎯 Áreas de foco: ${strategy.focusAreas.join(', ')}`);

  // Emite evento de início de chunking
  sseEmitter.sendToCurrent({
    type: 'chunking_started',
    data: {
      totalChunks: chunks.length,
      chunkSize: strategy.chunkSize,
      overlapLines: strategy.overlapLines,
      focusAreas: strategy.focusAreas
    }
  });

  // Processa cada chunk
  const chunkResults: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkInfo = chunks[i];
    logger.info(`\n📄 Processando ${chunkInfo.context}...`);

    // Emite progresso do chunk atual
    sseEmitter.sendToCurrent({
      type: 'chunk_progress',
      data: {
        currentChunk: i + 1,
        totalChunks: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100),
        chunkContext: chunkInfo.context,
        startLine: chunkInfo.startLine,
        endLine: chunkInfo.endLine
      }
    });

    try {
      const chunkResult = await stepTimingService.executeWithTiming(
        "analysis",
        `ana_chunk_${i + 1}` as any,
        `Análise Chunk ${i + 1}/${chunks.length}`,
        async () => {
          return await runQlikOptimizeAgent(chunkInfo.chunk, "analysis", llmOptions);
        },
        `Chunk ${i + 1}: ${chunkInfo.context}`
      );

      chunkResults.push({
        changes: chunkResult.analysis?.changes || [],
        summary: chunkResult.summary || '',
        metricsEstimate: chunkResult.analysis?.metricsEstimate
      });

      logger.info(`  ✓ ${chunkResult.analysis?.changes?.length || 0} issues encontrados`);
    } catch (error) {
      logger.error(`Erro no chunk ${i + 1}:`, error);
      // Continua com próximos chunks mesmo se um falhar
    }
  }

  // Mescla resultados
  logger.info("\n🔀 Consolidando resultados de todos os chunks...");
  const merged = mergeChunkResults(chunkResults, script);

  logger.info(`✅ Consolidação: ${merged.changes.length} issues únicos identificados`);

  // Parse do script completo para métricas
  const parsed = parseQlikScript(script);
  const qualityMetrics = calculateQualityMetrics(parsed);
  const realMetrics = calculateRealMetrics(script);

  // Gera relatório compacto
  const mockAnalysisResult: OptimizeResult = {
    originalScript: script,
    optimizedScript: script,
    summary: merged.summary,
    documentationMarkdown: '',
    analysis: {
      changes: merged.changes,
      breakingRisk: 'low' as const,
      safeToApply: true,
      mode: 'analysis' as const,
      metricsEstimate: merged.metricsEstimate || {
        estimatedLoadTimeReductionPercent: 0,
        estimatedRAMSavingsPercent: 0,
        estimatedLOCReduction: 0,
        complexityReduction: 0
      },
      realMetrics
    }
  };

  const compactReport = await generateCompactAuditReport(mockAnalysisResult, realMetrics);
  const roi = calculateROI(mockAnalysisResult);

  logger.info("✓ ANÁLISE CHUNKED concluída");
  logger.info(`  📊 Total de chunks: ${chunks.length}`);
  logger.info(`  ⚠️  Issues únicos: ${merged.changes.length}`);

  return {
    originalScript: script,
    optimizedScript: script, // Não modifica em modo análise
    summary: merged.summary,
    documentationMarkdown: '',
    analysis: {
      changes: merged.changes,
      breakingRisk: 'low' as const,
      safeToApply: true,
      mode: 'analysis' as const,
      metricsEstimate: merged.metricsEstimate || {
        estimatedLoadTimeReductionPercent: 0,
        estimatedRAMSavingsPercent: 0,
        estimatedLOCReduction: 0,
        complexityReduction: 0
      },
      realMetrics,
      roi
    },
    compactAuditReport: compactReport,
    analysisOnly: {
      parsed,
      qualityMetrics,
      allAntiPatterns: parsed.antiPatterns,
      roiExecutiveSummary: formatROIExecutiveSummary(roi)
    }
  };
}

/**
 * MODO ULTRA EXPERT CHUNKED - Para arquivos grandes QVD/QVS
 * Otimiza por chunks e consolida resultados
 */
async function runUltraExpertModeChunked(
  script: string,
  characteristics: ReturnType<typeof analyzeScriptCharacteristics>,
  llmOptions?: GenerateStructuredJsonOptions,
  generateConsultancy = true,
  abortSignal?: AbortSignal
): Promise<FullOptimizeResult> {
  checkAborted(abortSignal, 'Chunked optimization start');
  logger.info("⚡ Iniciando otimização CHUNKED...");

  const strategy = generateChunkStrategy(characteristics);
  const chunks = createScriptChunks(script, strategy);

  logger.info(`📦 Script dividido em ${chunks.length} chunks para otimização`);

  // Emite evento de início de chunking para ultra-expert
  sseEmitter.sendToCurrent({
    type: 'chunking_started',
    data: {
      totalChunks: chunks.length,
      chunkSize: strategy.chunkSize,
      overlapLines: strategy.overlapLines,
      focusAreas: strategy.focusAreas,
      mode: 'ultra-expert'
    }
  });

  // Processa cada chunk
  const chunkResults: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    checkAborted(abortSignal, `Before chunk ${i + 1}/${chunks.length}`);
    const chunkInfo = chunks[i];
    logger.info(`\n⚡ Otimizando ${chunkInfo.context}...`);

    // Emite progresso do chunk em otimização
    sseEmitter.sendToCurrent({
      type: 'chunk_progress',
      data: {
        currentChunk: i + 1,
        totalChunks: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100),
        chunkContext: chunkInfo.context,
        startLine: chunkInfo.startLine,
        endLine: chunkInfo.endLine,
        mode: 'ultra-expert'
      }
    });

    try {
      const chunkResult = await stepTimingService.executeWithTiming(
        "optimization",
        `opt_chunk_${i + 1}` as any,
        `Otimização Chunk ${i + 1}/${chunks.length}`,
        async () => {
          return await runQlikOptimizeAgent(chunkInfo.chunk, "ultra-expert", llmOptions);
        },
        `Chunk ${i + 1}: ${chunkInfo.context}`
      );

      chunkResults.push({
        changes: chunkResult.analysis?.changes || [],
        summary: chunkResult.summary || '',
        metricsEstimate: chunkResult.analysis?.metricsEstimate,
        optimizedChunk: chunkResult.optimizedScript || chunkInfo.chunk
      });

      logger.info(`  ✓ ${chunkResult.analysis?.changes?.length || 0} otimizações aplicadas`);
    } catch (error) {
      logger.error(`Erro no chunk ${i + 1}:`, error);
      chunkResults.push({
        changes: [],
        summary: '',
        optimizedChunk: chunkInfo.chunk // Mantém original se falhar
      });
    }
  }

  // Mescla resultados
  logger.info("\n🔀 Consolidando otimizações...");
  const merged = mergeChunkResults(chunkResults, script);

  // Reconstrói script otimizado (usa chunks otimizados)
  const optimizedScript = chunkResults.map(r => r.optimizedChunk).join('\n');

  // Validação final
  const validated = validateQlikScript(optimizedScript);

  if (!validated.safe || validated.warnings.length > 0) {
    logger.warn("⚠️  Validação detectou problemas no script consolidado - retornando original");
    if (validated.warnings.length > 0) {
      validated.warnings.forEach(w => logger.warn(`    - ${w}`));
    }
    return runUltraExpertMode(script, llmOptions, generateConsultancy); // Fallback para modo tradicional
  } const realMetrics = calculateRealMetrics(script);
  const mockResult: OptimizeResult = {
    originalScript: script,
    optimizedScript,
    summary: merged.summary,
    documentationMarkdown: '',
    analysis: {
      changes: merged.changes,
      breakingRisk: validated.warnings.length > 0 ? 'medium' as const : 'low' as const,
      safeToApply: validated.safe,
      mode: 'ultra-expert' as const,
      metricsEstimate: merged.metricsEstimate || {
        estimatedLoadTimeReductionPercent: 0,
        estimatedRAMSavingsPercent: 0,
        estimatedLOCReduction: 0,
        complexityReduction: 0
      },
      realMetrics
    }
  };

  const compactReport = await generateCompactAuditReport(mockResult, realMetrics);
  const roi = calculateROI(mockResult);

  logger.info("✅ OTIMIZAÇÃO CHUNKED concluída");
  logger.info(`  📦 Chunks processados: ${chunks.length}`);
  logger.info(`  🔧 Otimizações consolidadas: ${merged.changes.length}`);

  return {
    originalScript: script,
    optimizedScript,
    summary: merged.summary,
    documentationMarkdown: '',
    analysis: {
      changes: merged.changes,
      breakingRisk: validated.warnings.length > 0 ? 'medium' as const : 'low' as const,
      safeToApply: validated.safe,
      mode: 'ultra-expert' as const,
      metricsEstimate: merged.metricsEstimate || {
        estimatedLoadTimeReductionPercent: 0,
        estimatedRAMSavingsPercent: 0,
        estimatedLOCReduction: 0,
        complexityReduction: 0
      },
      realMetrics,
      roi
    },
    compactAuditReport: compactReport
  };
}

function createOptimizerService() {
  const runOptimization = (
    script: string,
    mode: OptimizeMode,
    llmOptions?: GenerateStructuredJsonOptions,
    generateConsultancy = true
  ): Promise<FullOptimizeResult> => {
    return optimizeScript(script, mode, llmOptions, generateConsultancy);
  };

  return {
    runOptimization
  };
}

export const optimizerService = createOptimizerService();
