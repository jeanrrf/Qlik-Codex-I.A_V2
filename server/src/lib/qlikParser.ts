import type { QualityMetrics } from "../types/qlik";

/**
 * Qlik Script Parser - Análise Estrutural Real
 * Extrai metadados, estruturas e padrões do código Qlik
 */

export interface QlikTable {
  name: string;
  lineStart: number;
  lineEnd: number;
  fields: string[];
  source?: string; // FROM clause
  isResident?: boolean;
  hasJoin?: boolean;
  joinType?: 'LEFT' | 'INNER' | 'OUTER' | 'RIGHT';
}

export interface QlikVariable {
  name: string;
  type: 'SET' | 'LET';
  value: string;
  line: number;
}

export interface QlikJoin {
  type: 'LEFT JOIN' | 'INNER JOIN' | 'OUTER JOIN' | 'RIGHT JOIN' | 'JOIN';
  targetTable: string;
  line: number;
}

export interface AntiPattern {
  type: 'SELECT_STAR' | 'CROSS_JOIN' | 'MISSING_WHERE' | 'RESIDENT_ABUSE' |
  'SYNTHETIC_KEY_RISK' | 'CIRCULAR_REF' | 'DUPLICATE_LOAD' |
  'MISSING_QUALIFIER' | 'INEFFICIENT_APPLYMAP' | 'CARTESIAN_PRODUCT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  line: number;
  description: string;
  suggestion: string;
}

export interface ParsedScript {
  tables: QlikTable[];
  variables: QlikVariable[];
  joins: QlikJoin[];
  antiPatterns: AntiPattern[];
  complexity: {
    cyclomaticComplexity: number;
    loadCount: number;
    joinCount: number;
    loopCount: number;
    tableCount: number;
  };
  metrics: {
    totalLines: number;
    codeLines: number;
    commentLines: number;
    blankLines: number;
  };
}

/**
 * Parse completo do script Qlik
 */
export function parseQlikScript(script: string): ParsedScript {
  const lines = script.split(/\r?\n/);
  const tables: QlikTable[] = [];
  const variables: QlikVariable[] = [];
  const joins: QlikJoin[] = [];
  const antiPatterns: AntiPattern[] = [];

  let currentTable: QlikTable | null = null;
  let loadCount = 0;
  let joinCount = 0;
  let loopCount = 0;

  // Métricas básicas
  let codeLines = 0;
  let commentLines = 0;
  let blankLines = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();

    // Métricas de linha
    if (trimmed.length === 0) {
      blankLines++;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      commentLines++;
      continue;
    }
    codeLines++;

    // Detectar SET/LET
    const varMatch = trimmed.match(/^(SET|LET)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+);?$/i);
    if (varMatch) {
      variables.push({
        type: varMatch[1].toUpperCase() as 'SET' | 'LET',
        name: varMatch[2],
        value: varMatch[3],
        line: i + 1
      });
    }

    // Detectar LOAD
    if (upper.includes('LOAD')) {
      loadCount++;

      // Detectar LOAD *
      if (upper.match(/LOAD\s+\*/)) {
        antiPatterns.push({
          type: 'SELECT_STAR',
          severity: 'medium',
          line: i + 1,
          description: 'LOAD * carrega todos os campos, mesmo os não utilizados',
          suggestion: 'Liste explicitamente apenas os campos necessários'
        });
      }

      // Detectar FROM
      const fromMatch = trimmed.match(/FROM\s+\[?([^\];\n]+)\]?/i);
      if (fromMatch) {
        if (currentTable) {
          currentTable.source = fromMatch[1].trim();
        }
      }

      // Detectar RESIDENT
      if (upper.includes('RESIDENT')) {
        if (currentTable) {
          currentTable.isResident = true;
        }

        // Verificar RESIDENT abuse (múltiplos loads resident seguidos)
        const nextLines = lines.slice(i + 1, i + 10).join('\n').toUpperCase();
        if (nextLines.split('RESIDENT').length > 3) {
          antiPatterns.push({
            type: 'RESIDENT_ABUSE',
            severity: 'high',
            line: i + 1,
            description: 'Múltiplos LOAD RESIDENT consecutivos podem impactar performance',
            suggestion: 'Considere consolidar em um único LOAD ou usar JOIN'
          });
        }
      }
    }

    // Detectar tabelas (label seguido de dois pontos)
    const tableMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (tableMatch) {
      if (currentTable) {
        currentTable.lineEnd = i;
        tables.push(currentTable);
      }
      currentTable = {
        name: tableMatch[1],
        lineStart: i + 1,
        lineEnd: i + 1,
        fields: [],
        isResident: false,
        hasJoin: false
      };
    }

    // Detectar JOINs
    const joinMatch = upper.match(/(LEFT\s+JOIN|INNER\s+JOIN|OUTER\s+JOIN|RIGHT\s+JOIN|^\s*JOIN)/);
    if (joinMatch) {
      joinCount++;
      const rawJoin = (joinMatch[1] || '').trim();
      // Normalize join type to the known union
      let joinTypeUnion: QlikJoin['type'] = 'JOIN';
      const upperJoin = rawJoin.toUpperCase();
      if (upperJoin.startsWith('LEFT')) joinTypeUnion = 'LEFT JOIN';
      else if (upperJoin.startsWith('INNER')) joinTypeUnion = 'INNER JOIN';
      else if (upperJoin.startsWith('OUTER')) joinTypeUnion = 'OUTER JOIN';
      else if (upperJoin.startsWith('RIGHT')) joinTypeUnion = 'RIGHT JOIN';

      joins.push({
        type: joinTypeUnion,
        targetTable: currentTable?.name || 'Unknown',
        line: i + 1
      });

      if (currentTable) {
        currentTable.hasJoin = true;
        // For table joinType we store the short form without ' JOIN'
        const short = joinTypeUnion.replace(' JOIN', '') as QlikTable['joinType'];
        currentTable.joinType = short;
      }

      // Verificar se tem ON clause (se não tiver, pode ser Cartesian Product)
      const onClause = lines.slice(i, i + 5).join('\n').toUpperCase();
      if (!onClause.includes('ON ') && !onClause.includes('WHERE')) {
        antiPatterns.push({
          type: 'CARTESIAN_PRODUCT',
          severity: 'critical',
          line: i + 1,
          description: 'JOIN sem cláusula ON ou WHERE pode gerar produto cartesiano',
          suggestion: 'Adicione condição de JOIN explícita'
        });
      }
    }

    // Detectar loops
    if (upper.match(/\b(FOR|DO\s+WHILE|DO\s+UNTIL)\b/)) {
      loopCount++;
    }

    // Detectar WHERE ausente em LOADs grandes
    if (upper.includes('LOAD') && !upper.includes('WHERE')) {
      const nextFewLines = lines.slice(i, i + 20).join('\n').toUpperCase();
      if (!nextFewLines.includes('WHERE') && nextFewLines.includes('FROM')) {
        antiPatterns.push({
          type: 'MISSING_WHERE',
          severity: 'low',
          line: i + 1,
          description: 'LOAD sem cláusula WHERE pode carregar dados desnecessários',
          suggestion: 'Considere adicionar filtro WHERE para carregar apenas dados relevantes'
        });
      }
    }
  }

  // Finalizar última tabela
  if (currentTable) {
    currentTable.lineEnd = lines.length;
    tables.push(currentTable);
  }

  // Calcular complexidade ciclomática (simplificada)
  const cyclomaticComplexity = 1 +
    (script.match(/\bIF\b/gi)?.length || 0) +
    (script.match(/\bELSE\b/gi)?.length || 0) +
    (script.match(/\bFOR\b/gi)?.length || 0) +
    (script.match(/\bWHILE\b/gi)?.length || 0);

  return {
    tables,
    variables,
    joins,
    antiPatterns,
    complexity: {
      cyclomaticComplexity,
      loadCount,
      joinCount,
      loopCount,
      tableCount: tables.length
    },
    metrics: {
      totalLines: lines.length,
      codeLines,
      commentLines,
      blankLines
    }
  };
}

/**
 * Detecta chaves sintéticas potenciais
 */
export function detectSyntheticKeys(parsed: ParsedScript): AntiPattern[] {
  const patterns: AntiPattern[] = [];

  // Simplificado: se há múltiplas tabelas com JOINs complexos
  const tablesWithJoins = parsed.tables.filter(t => t.hasJoin);

  if (tablesWithJoins.length > 2) {
    patterns.push({
      type: 'SYNTHETIC_KEY_RISK',
      severity: 'medium',
      line: tablesWithJoins[0].lineStart,
      description: `${tablesWithJoins.length} tabelas com JOINs podem gerar chaves sintéticas`,
      suggestion: 'Revise o modelo de dados e considere usar QUALIFY ou renomear campos'
    });
  }

  return patterns;
}

/**
 * Calcula métricas de qualidade do código
 */
export function calculateQualityMetrics(parsed: ParsedScript): QualityMetrics {
  const { metrics, complexity } = parsed;

  // Índice de manutenibilidade (simplificado, 0-100)
  const commentRatio = metrics.commentLines / metrics.codeLines;
  const complexityPenalty = Math.min(complexity.cyclomaticComplexity / 50, 1);
  const maintainabilityIndex = Math.max(0, Math.min(100,
    100 - (complexityPenalty * 30) + (commentRatio * 20)
  ));

  return {
    maintainabilityIndex: Math.round(maintainabilityIndex),
    commentRatio: Math.round(commentRatio * 100),
    averageComplexityPerTable: parsed.tables.length > 0
      ? Math.round(complexity.cyclomaticComplexity / parsed.tables.length)
      : 0,
    codeToCommentRatio: `${metrics.codeLines}:${metrics.commentLines}`,
    qualityGrade: maintainabilityIndex >= 80 ? 'A' :
      maintainabilityIndex >= 60 ? 'B' :
        maintainabilityIndex >= 40 ? 'C' :
          maintainabilityIndex >= 20 ? 'D' : 'F'
  };
}
