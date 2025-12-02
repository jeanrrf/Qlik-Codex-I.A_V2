export interface QlikPattern {
  id: string;
  trigger: RegExp;
  title: string;
  advice: string;
  severity: "info" | "warning" | "critical";
}

export const QLIK_EXPERT_PATTERNS: QlikPattern[] = [
  {
    id: "exists-vs-in",
    trigger: /\bWHERE\s+.*\bIN\s*\(/i,
    title: "Uso de IN vs EXISTS",
    advice: "Em Qlik, `Exists(Campo)` é significativamente mais rápido que `Campo IN (...)` ou comparações diretas quando filtrando por uma lista de valores já carregados. Prefira carregar a lista de filtro primeiro e usar `WHERE Exists(Campo)`.",
    severity: "warning"
  },
  {
    id: "applymap-vs-join",
    trigger: /\bLEFT\s+JOIN\b/i,
    title: "ApplyMap vs JOIN",
    advice: "Se o JOIN for usado apenas para trazer 1 ou 2 campos de uma tabela de dimensão (lookup), `ApplyMap` é muito mais performático e evita o risco de duplicar registros (fan trap). Considere converter JOINs de lookup em MAPPING LOAD + ApplyMap().",
    severity: "info"
  },
  {
    id: "count-distinct",
    trigger: /\bCount\s*\(\s*DISTINCT\b/i,
    title: "Count(Distinct) em grandes volumes",
    advice: "Count(Distinct) é uma operação custosa. Se possível, pré-calcule contagens na camada de script ou use aproximações se a precisão absoluta não for crítica em tempo real. Em scripts, tente resolver a unicidade antes da agregação.",
    severity: "warning"
  },
  {
    id: "if-vs-pickmatch",
    trigger: /\bIF\s*\(.*IF\s*\(.*IF\s*\(/i,
    title: "IFs Aninhados",
    advice: "IFs aninhados são lentos e difíceis de ler. Substitua por `Pick(Match(Campo, 'Val1', 'Val2'), 'Res1', 'Res2')` ou use uma tabela de mapeamento (ApplyMap) para decodificar valores.",
    severity: "warning"
  },
  {
    id: "date-functions",
    trigger: /\b(Year|Month|Day|Week)\s*\(/i,
    title: "Calendário Mestre",
    advice: "Evite calcular funções de data (Year, Month, etc.) repetidamente em tabelas fato. Gere um Calendário Mestre (Master Calendar) conectado à data principal e mantenha a fato 'magra'.",
    severity: "info"
  },
  {
    id: "select-star",
    trigger: /^SQL\s+SELECT\s+\*/im,
    title: "SELECT * (SQL)",
    advice: "Evite `SELECT *` em conexões SQL. Traga apenas as colunas necessárias para reduzir I/O de rede e consumo de memória. Liste as colunas explicitamente.",
    severity: "critical"
  },
  {
    id: "load-star",
    trigger: /^LOAD\s+\*/im,
    title: "LOAD * (Qlik)",
    advice: "`LOAD *` pode trazer campos desnecessários ou criar chaves sintéticas acidentais se tabelas diferentes tiverem campos com mesmo nome não intencionais. Liste os campos explicitamente sempre que possível.",
    severity: "warning"
  },
  {
    id: "synthetic-keys",
    trigger: /./, // Trigger genérico, a lógica do agente deve detectar isso pelo contexto de múltiplos campos com mesmo nome
    title: "Chaves Sintéticas",
    advice: "Chaves sintéticas (Synthetic Keys) consomem memória e CPU. Se duas tabelas compartilham mais de um campo, crie uma chave composta (Autonumber/Hash) ou use QUALIFY/RENAME para desambiguar campos que não devem ligar.",
    severity: "critical"
  },
  {
    id: "concatenate-load",
    trigger: /\bCONCATENATE\b/i,
    title: "Concatenação Automática",
    advice: "O Qlik concatena automaticamente tabelas com mesmos nomes de campo. Use `NOCONCATENATE` se a intenção for criar uma nova tabela separada, ou garanta que a concatenação é intencional para evitar tabelas gigantescas inesperadas.",
    severity: "info"
  },
  {
    id: "qvd-optimized",
    trigger: /\.qvd/i,
    title: "Carga Otimizada de QVD",
    advice: "Para garantir carga otimizada (super rápida) de QVDs, não faça transformações (cálculos, renomeações) no LOAD. Carregue o QVD puro e faça transformações em um passo subsequente (Resident) se necessário, ou garanta que o QVD já esteja no formato final.",
    severity: "info"
  },
  {
    id: "set-analysis-in-script",
    trigger: /\{<.*>\}/,
    title: "Set Analysis no Script",
    advice: "Set Analysis (ex: `{<Ano={2023}>}`) é uma funcionalidade de FRONT-END (gráficos). Não funciona no Script de Carga (LOAD). Para filtrar no script, use a cláusula `WHERE`. Ex: `WHERE Ano = 2023`.",
    severity: "critical"
  },
  {
    id: "sql-functions-in-qlik",
    trigger: /\b(CASE\s+WHEN|DATEDIFF|GETDATE|NVL|SUBSTRING|CHARINDEX|CAST|CONVERT)\b/i,
    title: "Funções SQL em Script Qlik",
    advice: "Você está usando funções SQL (CASE WHEN, DATEDIFF, etc) dentro de um comando LOAD do Qlik. O Qlik tem sua própria sintaxe: use `If/Pick`, `-` (subtração), `Today()`, `Alt()`, `Mid()`, `Index()`, `Num/Text`.",
    severity: "critical"
  },
  {
    id: "cartesian-product",
    trigger: /\bJOIN\b(?!.*\bON\b)/i,
    title: "Produto Cartesiano (JOIN sem ON)",
    advice: "JOIN sem cláusula ON gera produto cartesiano (todas as combinações possíveis), causando explosão de dados e travamento. SEMPRE especifique campos de ligação: `LEFT JOIN (tabela) ON campo1 = campo2`. Se intencional, documente explicitamente.",
    severity: "critical"
  },
  {
    id: "circular-reference",
    trigger: /./, // Detectado por análise de grafo, não regex
    title: "Referência Circular Entre Tabelas",
    advice: "Tabelas que se referenciam mutuamente (A → B → A) criam loops infinitos no modelo associativo. Use QUALIFY para quebrar o ciclo ou crie uma tabela bridge intermediária. Verifique modelo de dados no visualizador de tabelas.",
    severity: "critical"
  },
  {
    id: "autonumber-performance",
    trigger: /\bAutonumber\s*\(/i,
    title: "Autonumber vs AutoNumberHash",
    advice: "Para chaves compostas com muitos valores distintos (>100k), `AutoNumberHash128()` ou `AutoNumberHash256()` são 3-5x mais rápidos que `Autonumber()` e consomem menos RAM. Use para campos de alta cardinalidade.",
    severity: "info"
  },
  {
    id: "peek-in-loop",
    trigger: /\b(FOR|DO\s+WHILE|DO\s+UNTIL)\b[\s\S]*?\bPeek\s*\(/i,
    title: "Peek() em Loop (Complexidade Quadrática)",
    advice: "Usar `Peek()` dentro de FOR/DO cria complexidade O(n²). Alternativas: 1) Carregue dados em tabela temporária e use RESIDENT, 2) Use Previous() se acesso sequencial, 3) ApplyMap para lookups. Ganho típico: 10-100x mais rápido.",
    severity: "warning"
  },
  {
    id: "intervalmatch-misuse",
    trigger: /\bIntervalMatch\b/i,
    title: "IntervalMatch - Uso Correto",
    advice: "IntervalMatch requer tabela já carregada com campo de evento E tabela de intervalos (Start, End). Ordem correta: 1) LOAD eventos, 2) LOAD intervalos, 3) IntervalMatch. Erro comum: inverter ordem ou usar campos não carregados. Valide dimensionalidade resultante.",
    severity: "warning"
  },
  {
    id: "generic-load-breaks-qvd",
    trigger: /\bGENERIC\s+LOAD\b/i,
    title: "Generic LOAD Quebra Otimização QVD",
    advice: "GENERIC LOAD sempre força carga NÃO otimizada de QVDs (modo lento, campo a campo). Se origem é QVD otimizado, carregue primeiro sem GENERIC, depois transforme com RESIDENT. Ganho: até 50x mais rápido em QVDs grandes (>1GB).",
    severity: "warning"
  },
  {
    id: "unintended-concatenate",
    trigger: /^(?!.*NOCONCATENATE).*LOAD\b/im,
    title: "Concatenação Automática Não Intencional",
    advice: "Qlik concatena automaticamente tabelas com mesmo nome E mesma estrutura de campos. Se criar tabela com mesmo nome por acidente, dados são fundidos silenciosamente. Use NOCONCATENATE explicitamente ou nomes únicos. Verifique: número de registros inesperado = possível concatenação não intencional.",
    severity: "info"
  },
  {
    id: "qualify-without-unqualify",
    trigger: /\bQUALIFY\s+\*/i,
    title: "QUALIFY * sem UNQUALIFY Estratégico",
    advice: "QUALIFY * prefixa TODOS os campos (incluindo chaves), quebrando associações. Padrão correto: `QUALIFY *; UNQUALIFY ChavePrimaria, ChaveEstrangeira;` antes do LOAD. Campos de ligação DEVEM ter nomes idênticos não qualificados.",
    severity: "warning"
  },
  {
    id: "resident-without-drop",
    trigger: /\bRESIDENT\b(?!.*DROP)/i,
    title: "Resident LOAD sem DROP Intermediário",
    advice: "Carregar RESIDENT de tabela temporária sem DROP ao final duplica consumo de RAM (dados ficam em memória 2x). Padrão: `LOAD ... RESIDENT Temp; DROP TABLE Temp;`. Economia típica: 30-50% de RAM em transformações complexas.",
    severity: "warning"
  },
  {
    id: "where-exists-order",
    trigger: /\bWHERE\s+Exists\s*\(/i,
    title: "WHERE EXISTS - Ordem de Execução",
    advice: "WHERE EXISTS(Campo) só funciona se a tabela referenciada JÁ foi carregada anteriormente. Erro comum: usar EXISTS antes de carregar a lista de filtro. Ordem correta: 1) LOAD lista de valores, 2) LOAD tabela fato WHERE EXISTS(campo). Valide ordem de execução no script.",
    severity: "warning"
  },
  {
    id: "aggregation-in-script",
    trigger: /\b(Sum|Count|Avg|Min|Max)\s*\((?!.*GROUP\s+BY)/i,
    title: "Funções de Agregação sem GROUP BY",
    advice: "Usar Sum(), Count(), etc. no script SEM GROUP BY gera 1 único registro agregado, perdendo granularidade. Se intencional (KPI único), OK. Se não: 1) Use GROUP BY para agregar por dimensões, 2) Ou mova agregação para frontend (expressões de gráfico).",
    severity: "warning"
  }
];

export function getRelevantPatterns(script: string): QlikPattern[] {
  return QLIK_EXPERT_PATTERNS.filter(p => p.trigger.test(script));
}

/**
 * Formata patterns detectados para injection em prompts LLM
 */
export function formatPatternsForPrompt(patterns: QlikPattern[]): string {
  if (patterns.length === 0) {
    return "Nenhum anti-pattern específico detectado por regex. Analise métricas gerais.";
  }

  return patterns.map((p, idx) =>
    `[${p.id.toUpperCase()}] ${p.title}\n   └─ ${p.advice}\n   └─ Severidade: ${p.severity.toUpperCase()}`
  ).join('\n\n');
}

/**
 * Lista todos os anti-patterns disponíveis (para prompts)
 */
export function getAllPatternsReference(): string {
  return QLIK_EXPERT_PATTERNS.map((p, idx) =>
    `[APATTERN-${String(idx + 1).padStart(3, '0')}] ${p.id}: ${p.title}`
  ).join('\n');
}

/**
 * Valida se um impact field cita anti-pattern ou métrica
 */
export function validateImpactQuality(impact: string): { valid: boolean; reason?: string } {
  // Check for anti-pattern citation
  const hasAntiPatternCitation = /\[APATTERN-\d{3}\]|\[\w+-\w+-\w+\]/i.test(impact);

  // Check for metric citation (LOC, CC, MI, percentage)
  const hasMetricCitation = /\b(LOC|CC|MI|complexity|maintainability)\s*[+-]?\s*\d+/i.test(impact) ||
    /-\d+%|\+\d+%/.test(impact);

  if (hasAntiPatternCitation || hasMetricCitation) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: "Impact field must cite either [APATTERN-XXX] or metric delta (LOC/CC/MI +/- N)"
  };
}
