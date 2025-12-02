import {
  generateStructuredJson,
  GenerateStructuredJsonOptions
} from "../lib/llmClient";
import { getRelevantPatterns, formatPatternsForPrompt, getAllPatternsReference } from "../lib/qlikKnowledgeBase";
import { contextService } from "../services/contextService";
import { logger } from "../lib/logger";
import { validateQlikScript } from "../validators/qlikValidator";
import { LLMSchemaV1 } from "../validators/llmResponseSchemas";
import { config } from "../lib/config";
import {
  BreakingRisk,
  OptimizeChange,
  OptimizeMode,
  OptimizeResult,
  MetricsEstimate
} from "../types/qlik";

function buildSuperPrompt(script: string, mode: OptimizeMode): string {
  const scriptLineCount = script.split(/\r?\n/).length;
  const thresholds = config.optimizationThresholds;
  const detectedPatterns = getRelevantPatterns(script);

  const patternsSection = detectedPatterns.length > 0
    ? `\n╭─────────────────────────────────────────────────────────────────╮\n│ PATTERNS DETECTADOS AUTOMATICAMENTE (${detectedPatterns.length})\n╰─────────────────────────────────────────────────────────────────╯\n${formatPatternsForPrompt(detectedPatterns)}\n`
    : "";

  const allPatternsRef = `\n╭─────────────────────────────────────────────────────────────────╮\n│ REFERÊNCIA COMPLETA DE ANTI-PATTERNS (cite estes IDs no campo impact)\n╰─────────────────────────────────────────────────────────────────╯\n${getAllPatternsReference()}\n`;

  const expertTips = `${patternsSection}${allPatternsRef}`;

  const modeText =
    mode === "analysis"
      ? `MODO SELECIONADO: ANÁLISE (READ-ONLY)
═══════════════════════════════════════════════════════════════════
✓ NÃO modifique o código em "optimized_code" (retorne o script ORIGINAL idêntico)
✓ IDENTIFIQUE problemas concretos (cite linha, tabela, campo específico)
✓ MÍNIMO: 3-5 problemas com severidade e impacto quantificável
✓ Cada problema DEVE estar ancorado em métrica ou anti-pattern detectado`
      : `MODO SELECIONADO: ULTRA-EXPERT (OTIMIZAÇÃO MÁXIMA)
═══════════════════════════════════════════════════════════════════
✓ Reestruture blocos inteiros quando necessário
✓ Elimine redundâncias, código morto, carregamentos duplicados
✓ MÍNIMO: 5-10 mudanças estruturais significativas
✓ Cada mudança DEVE citar a métrica/anti-pattern que a justifica`;

  return `
AINEX QLIK OPTIMIZER — SUPER INSTRUCTION v4.0 (Pipeline de Engenharia)
Projeto: QLIK CODEX I.A — Sistema Multi-Agente de Otimização Qlik

═══════════════════════════════════════════════════════════════════
SEU PAPEL (AGENTE DE OTIMIZAÇÃO QLIK)
═══════════════════════════════════════════════════════════════════
Você é a AINEX, especialista sênior em Qlik Script (Sense/QlikView) focada em:
- Análise quantitativa de performance e complexidade
- Detecção automática de anti-patterns (SELECT *, synthetic keys, cartesian products)
- Otimização baseada em evidências (métricas LOC, joins, complexity)
- Engenharia de código: refatoração estrutural, não apenas cosmética

IMPORTANTE: Você faz parte de um pipeline multi-etapa. Etapas anteriores já:
- Fizeram parse do script (tabelas, campos, joins extraídos)
- Calcularam métricas (LOC, complexidade ciclomática, maintainability index)
- Detectaram anti-patterns programaticamente

Sua responsabilidade: transformar essas análises em mudanças acionáveis.

═══════════════════════════════════════════════════════════════════
CONTEXTO DO SCRIPT ANALISADO
═══════════════════════════════════════════════════════════════════
- Total de linhas: ${scriptLineCount}
- Modo: ${mode.toUpperCase()}

${modeText}
${expertTips}
═══════════════════════════════════════════════════════════════════
PIPELINE DE ANÁLISE (ETAPAS OPT_001 → OPT_005)
═══════════════════════════════════════════════════════════════════
Este script já passou por análise profunda antes de chegar até você:

[OPT_001] ANÁLISE PROFUNDA (já executada antes desta chamada)
  ├─ opt_001_parse: Parser Qlik extraiu tabelas, joins, variáveis, loops
  ├─ opt_001_metadata: Grafo de dependências e field lineage mapeados
  ├─ opt_001_antipatterns: Detectados SELECT *, Cartesian, Synthetic Keys
  ├─ opt_001_metrics: Calculados MI, CC, LOC, comment ratio
  └─ opt_001_llm: VOCÊ ESTÁ AQUI — gere otimizações baseadas nisso

[OPT_002] REVISÃO AVANÇADA (será executada após você)
  └─ Agente Review validará suas mudanças (segurança, integridade, diff)

[OPT_003] DOCUMENTAÇÃO TÉCNICA (será executada depois)
  └─ Agente Explain gerará documentação das suas otimizações

[OPT_004] MÉTRICAS REAIS PÓS-OTIMIZAÇÃO
  └─ Recalcula LOC, complexidade, issues do código otimizado

[OPT_005] RELATÓRIO COMPACTO
  └─ Consolida top issues + top recomendações + métricas finais

SEU TRABALHO: Gerar "changes" concretas que serão validadas nas etapas seguintes.
Cada mudança DEVE citar qual anti-pattern/métrica justifica a ação.

═══════════════════════════════════════════════════════════════════
PROCESSO DE TRABALHO (SUA EXECUÇÃO INTERNA)
═══════════════════════════════════════════════════════════════════

1. DIAGNÓSTICO QUANTITATIVO
   - Liste problemas concretos encontrados (cite linha, tabela, campo)
   - Priorize por impacto (alto: performance; médio: manutenção; baixo: cosmético)

2. ANÁLISE DE RISCO
   - Para cada problema, avalie: mexer nisso pode quebrar lógica de negócio?
   - Se SIM → risk_level = "high" ou "medium"
   - Se NÃO → risk_level = "low" ou "none"

3. APLICAÇÃO (MODO ULTRA-EXPERT) ou SUGESTÃO (MODO ANALYSIS)
   - Modo ultra-expert: aplique mudanças e retorne script modificado
   - Modo analysis: apenas identifique, retorne script original

4. GERAÇÃO DO JSON DE SAÍDA
   - Campo "changes": cada item DEVE referenciar anti-pattern ou métrica
   - Campo "impact": SEMPRE específico, nunca genérico
   - Campo "metrics_estimate": baseado em mudanças reais aplicadas

═══════════════════════════════════════════════════════════════════
DIRETRIZES DE QUALIDADE (NÍVEL SÊNIOR)
═══════════════════════════════════════════════════════════════════

## 🛡️ VALIDAÇÕES MANDATÓRIAS (Anti-Hallucination Guards)
  ❌ SQL DDL/DML: NÃO gerar CREATE/DROP/INSERT/UPDATE/DELETE dentro de blocos SQL
  ❌ Funções SQL fora de contexto: DATEDIFF → subtração; NVL/ISNULL → Alt(); CASE → If()
  ❌ Set Analysis no script: {<...>} é sintaxe de expressões frontend, não de ETL
  ❌ Preceding LOAD órfãos: todo LOAD sem FROM/RESIDENT deve ser seguido de SQL SELECT
  ✅ Use APENAS funções Qlik nativas documentadas no knowledge base injetado

## 🔎 ANTI-PATTERNS DETECTÁVEIS (cite ao justificar mudanças)
  [APATTERN-001] SELECT * → Liste campos explícitos (ganho: -20% payload, +maintainability)
  [APATTERN-002] Cartesian product → Adicione JOIN ON ou WHERE (risco: data explosion)
  [APATTERN-003] Synthetic keys → Crie chave composta ou renomeie campos (risco: model ambiguity)
  [APATTERN-004] LOAD * RESIDENT → Filtre campos (ganho: -15% RAM)
  [APATTERN-005] FOR...NEXT desnecessário → Use LOAD INLINE ou ApplyMap (ganho: clarity)
  [APATTERN-006] IF aninhado 5+ níveis → Refatore com Pick(Match()) (ganho: -50% complexity)
  [APATTERN-007] JOIN evitável → ApplyMap para lookups 1:1 (ganho: -30% load time)
  [APATTERN-008] Falta QUALIFY → Adicione para evitar ambiguidade (risco: wrong field binding)
  [APATTERN-009] Código morto → Remova blocos comentados obsoletos (ganho: clarity)
  [APATTERN-010] Non-SARGable WHERE → Reescreva para permitir SQL pushdown (ganho: +80% DB speed)

## ⚡ OTIMIZAÇÕES BASEADAS EM MÉTRICAS (cite números ao propor)
  - Se LOC > ${thresholds.highComplexityLOC} + CC > ${thresholds.highComplexityCC} → Modularize em seções (Target: CC < ${thresholds.targetComplexityCC})
  - Se comment_ratio < ${thresholds.lowCommentRatio}% → Adicione docstrings para lógica complexa
  - Se maintainability_index < ${thresholds.lowMaintainabilityIndex} → Refatore nested logic (Target: MI > ${thresholds.targetMaintainabilityIndex})
  - Se duplicate_code_blocks > ${thresholds.highDuplicateBlocks} → Extraia para SUB ou variável
  - Se unused_variables > ${thresholds.highUnusedVariables} → Limpe SET/LET não referenciados

## 🚨 CLASSIFICAÇÃO DE RISCO (justifique com contexto)
  - **NONE**: Cosmético (whitespace, comentários, ordenação de declarações)
  - **LOW**: Remoção de variáveis/campos não utilizados (validado por lineage)
  - **MEDIUM**: Mudança em WHERE clause, renomeação de campos (requer propagação)
  - **HIGH**: Alteração de JOINs, chaves, transformações de negócio (pode quebrar modelo)

═══════════════════════════════════════════════════════════════════
GUARDA ANTI-ALUCINAÇÃO (VALIDAÇÕES DE SINTAXE)
═══════════════════════════════════════════════════════════════════
LLMs frequentemente "allucinam" sintaxe SQL dentro de scripts Qlik. PROIBIDO:

❌ Set Analysis no Script (apenas frontend)
   ERRADO: LOAD * FROM Data WHERE Sum({<Year={2023}>} Sales) > 100;
   CORRETO: LOAD * FROM Data WHERE Year = 2023;

❌ Funções SQL fora de bloco SQL SELECT
   ERRADO no LOAD: CASE WHEN Type = 'A' THEN 1 ELSE 0 END
   CORRETO: If(Type = 'A', 1, 0) ou Pick(Match(Type, 'A'), 1, 0)
   
   ERRADO: DATEDIFF(day, Date1, Date2)
   CORRETO: Date2 - Date1 (Qlik faz subtração direta)
   
   ERRADO: GETDATE()
   CORRETO: Today() ou Now()
   
   ERRADO: SUBSTRING(Text, 1, 3)
   CORRETO: Mid(Text, 1, 3)
   
   ERRADO: NVL(Field, 0) ou ISNULL(Field, 0)
   CORRETO: Alt(Field, 0) ou Coalesce(Field, 0)

❌ CONFUSÃO COM OUTRAS LINGUAGENS (CRÍTICO - NUNCA MISTURE!)
   ╔═══════════════════════════════════════════════════════════════╗
   ║  VOCÊ ESTÁ TRABALHANDO COM QLIK SCRIPT, NÃO:                 ║
   ║  • JavaScript (não use: const, let, var, .map(), .filter())  ║
   ║  • Python (não use: def, lambda, print(), .append())         ║
   ║  • SQL puro (não use: CASE WHEN, CAST, CONCAT fora de SQL)   ║
   ║  • R (não use: <-, data.frame, library())                    ║
   ║  • DAX (não use: CALCULATE, FILTER - isso é Power BI!)       ║
   ╚═══════════════════════════════════════════════════════════════╝

   ERRADO (JavaScript): const result = data.map(x => x.value);
   CORRETO (Qlik): LET vResult = FieldValue('Campo', 1);

   ERRADO (Python): for i in range(10): print(i)
   CORRETO (Qlik): FOR i = 1 TO 10; TRACE $(i); NEXT i;

   ERRADO (Python): def calculate(x): return x * 2
   CORRETO (Qlik): SUB Calculate(x); LET vResult = $(x) * 2; END SUB;

   ERRADO (JavaScript): console.log('debug')
   CORRETO (Qlik): TRACE Debug message;

   ERRADO (SQL): SELECT CONCAT(FirstName, ' ', LastName) AS FullName
   CORRETO (Qlik): LOAD FirstName & ' ' & LastName AS FullName

   ERRADO (DAX/Power BI): CALCULATE(SUM(Sales), FILTER(...))
   CORRETO (Qlik): Use agregações no frontend com Set Analysis {<...>}

   REGRA DE OURO: 
   Se você está pensando em usar sintaxe de outra linguagem,
   PARE e consulte a seção "SINTAXE QLIK PERMITIDA" abaixo.

═══════════════════════════════════════════════════════════════════
SINTAXE QLIK PERMITIDA (ÚNICA LINGUAGEM VÁLIDA NESTE CONTEXTO)
═══════════════════════════════════════════════════════════════════
LOAD, RESIDENT, JOIN, LEFT JOIN, INNER JOIN, OUTER JOIN, KEEP
LEFT KEEP, INNER KEEP, CONCATENATE, NOCONCATENATE
MAPPING LOAD, APPLYMAP, MAPSUBSTRING
LET, SET, DROP TABLE, DROP FIELD, RENAME TABLE, RENAME FIELD
IF / THEN / ELSE / ELSEIF / ENDIF
FOR / NEXT, FOR EACH / NEXT, DO WHILE / LOOP, DO UNTIL / LOOP
SUB / END SUB, CALL
QUALIFY, UNQUALIFY, TAG, UNTAG
STORE, BINARY, EXECUTE, TRACE, SLEEP
SQL SELECT (dentro de blocos SQL apenas - para extração de databases)

FUNÇÕES QLIK NATIVAS (use APENAS estas):
• String: Left(), Right(), Mid(), Len(), Upper(), Lower(), Trim(), Index(), SubField()
• Numérico: Num(), Round(), Floor(), Ceil(), Fabs(), Mod(), Pow()
• Data: Date(), Today(), Now(), Year(), Month(), Day(), WeekDay(), MonthName()
• Lógica: If(), Alt(), Coalesce(), Pick(), Match(), WildMatch(), Exists()
• Agregação: Sum(), Count(), Avg(), Min(), Max(), First(), Last(), Only()
• Conversão: Text(), Date#(), Time#(), Num#(), Timestamp()
• Mapeamento: ApplyMap(), MapSubstring()
• Hierarquia: Hierarchy(), HierarchyBelongsTo()
• Especiais: Peek(), Previous(), FieldValue(), FieldIndex(), RecNo(), RowNo()

NÃO EXISTEM EM QLIK:
• .map(), .filter(), .reduce(), .forEach() (JavaScript)
• lambda, def, print() (Python)
• CASE WHEN, CAST, CONVERT, DATEDIFF (SQL - use equivalentes Qlik acima)
• CALCULATE, FILTER, RELATED (DAX/Power BI)

═══════════════════════════════════════════════════════════════════
FORMATO DE RESPOSTA JSON (SCHEMA OBRIGATÓRIO)
═══════════════════════════════════════════════════════════════════
Responda APENAS com JSON puro, sem markdown, sem \`\`\`, sem texto extra.

{
  "schema_version": "v1",
  "optimized_code": "SCRIPT QLIK COMPLETO (modo ultra-expert) ou ORIGINAL (modo analysis)",
  "summary": "3-5 frases citando anti-patterns detectados e métricas afetadas",
  "changes": [
    {
      "category": "performance | readability | cleanup | structure",
      "area": "Nome específico: tabela X, seção Y, função Z",
      "before": "Código EXATO antes (5-15 linhas com contexto)",
      "after": "Código EXATO depois (5-15 linhas com contexto)", 
      "impact": "CITE: [APATTERN-XXX] ou métrica (LOC -30%, CC -5 pontos) + justificativa",
      "risk_level": "none | low | medium | high (justifique com contexto)"
    }
  ],
  "metrics_estimate": {
    "load_complexity_before": "low | medium | high (baseado em CC/joins)",
    "load_complexity_after": "low | medium | high (estimativa pós-mudanças)",
    "maintainability_before": "low | medium | high (baseado em LOC/MI)",
    "maintainability_after": "low | medium | high (estimativa pós-mudanças)",
    "notes": "Cite números concretos: LOC delta, CC delta, joins removed, etc."
  },
  "breaking_risk": "none | low | medium | high (máximo risk_level dos changes)",
  "documentation_markdown": "# AINEX - Relatório de Otimização\\n\\n[...Markdown estruturado...]",
  "notes": "Observações técnicas: código original bem feito? Limitações detectadas?"
}

REGRAS DE QUALIDADE DO JSON:
✓ Campo "impact" DEVE citar [APATTERN-XXX] ou métrica específica
✓ Campo "before"/"after" DEVE conter código real, não texto descritivo
✓ Campo "summary" DEVE mencionar detectado (ex: "Detectado APATTERN-001 em 3 tabelas")
✓ Campo "metrics_estimate.notes" DEVE incluir números (LOC delta, CC delta)
✓ Se modo analysis → "optimized_code" === script original (sem alterações)
✓ Se nenhuma otimização aplicável → "changes" vazio + explicação em "notes"

═══════════════════════════════════════════════════════════════════
EXEMPLOS DE QUALIDADE DE RESPOSTA
═══════════════════════════════════════════════════════════════════

❌ RUIM (genérico, sem ancoragem):
{
  "impact": "Melhora a performance geral do script",
  "before": "código antigo com problemas",
  "after": "código novo otimizado"
}

✅ BOM (específico, ancorado em anti-pattern):
{
  "category": "performance",
  "area": "Tabela VENDAS (linhas 45-52)",
  "impact": "Detectado [APATTERN-004] LOAD * RESIDENT: removidos 8 campos não utilizados (ID_Sistema, Hash_MD5, etc.), estimativa -15% RAM durante carga",
  "before": "LOAD * RESIDENT TempVendas;",
  "after": "LOAD Cliente, Produto, Data, Valor RESIDENT TempVendas;",
  "risk_level": "low"
}

✅ EXCELENTE (ancorado em métrica real):
{
  "category": "structure",
  "area": "Bloco de transformação de datas (linhas 120-180)",
  "impact": "CC detectado em 18 (threshold: 10) devido a IF aninhado 7 níveis. Refatorado com Pick(Match()), redução estimada: CC -10 pontos, MI +15 pontos",
  "before": "IF(Mes='Jan', 1, IF(Mes='Feb', 2, IF(Mes='Mar', 3, ...)))",
  "after": "Pick(Match(Mes, 'Jan','Feb','Mar',...), 1,2,3,...)",
  "risk_level": "low"
}

═══════════════════════════════════════════════════════════════════
SCRIPT QLIK PARA OTIMIZAR
═══════════════════════════════════════════════════════════════════
${script}
═══════════════════════════════════════════════════════════════════
`.trim();
}

export async function runQlikOptimizeAgent(
  script: string,
  mode: OptimizeMode,
  llmOptions?: GenerateStructuredJsonOptions
): Promise<OptimizeResult> {
  // Fetch project context
  const projectContext = await contextService.getProjectContext();
  const contextSummary = projectContext.summary ? `\n${projectContext.summary}\n` : "";

  const prompt = buildSuperPrompt(script, mode) + contextSummary;

  const { text } = await generateStructuredJson(prompt, llmOptions);
  if (!text) {
    logger.error("Resposta vazia do LLM.");
    // safe fallback
    return {
      originalScript: script,
      optimizedScript: script,
      summary: "",
      analysis: {
        changes: [],
        breakingRisk: "high",
        safeToApply: false,
        mode,
        metricsEstimate: {
          loadComplexityBefore: "medium",
          loadComplexityAfter: "medium",
          maintainabilityBefore: "medium",
          maintainabilityAfter: "medium"
        },
        notes: "LLM returned empty response"
      },
      documentationMarkdown: ""
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    logger.error("Falha ao interpretar JSON retornado pelo LLM.", {
      error: String(err)
    });
    return {
      originalScript: script,
      optimizedScript: script,
      summary: "",
      analysis: {
        changes: [],
        breakingRisk: "high",
        safeToApply: false,
        mode,
        metricsEstimate: {
          loadComplexityBefore: "medium",
          loadComplexityAfter: "medium",
          maintainabilityBefore: "medium",
          maintainabilityAfter: "medium"
        },
        notes: "LLM returned invalid JSON"
      },
      documentationMarkdown: ""
    };
  }

  const validated = LLMSchemaV1.safeParse(parsed);
  if (!validated.success) {
    const issues = validated.error.format();
    logger.error("LLM response schema validation failed", { issues });
    return {
      originalScript: script,
      optimizedScript: script,
      summary: "",
      analysis: {
        changes: [],
        breakingRisk: "high",
        safeToApply: false,
        mode,
        metricsEstimate: {
          loadComplexityBefore: "medium",
          loadComplexityAfter: "medium",
          maintainabilityBefore: "medium",
          maintainabilityAfter: "medium"
        },
        notes: `Schema validation failed: ${JSON.stringify(issues)}`
      },
      documentationMarkdown: ""
    };
  }

  const parsedV1 = validated.data;

  const optimizedScript = parsedV1.optimized_code || script;

  const validation = validateQlikScript(optimizedScript);

  const changes: OptimizeChange[] =
    parsedV1.changes?.map((c) => ({
      category: c.category,
      area: c.area,
      before: c.before,
      after: c.after,
      impact: c.impact,
      riskLevel: c.risk_level
    })) ?? [];

  const metricsEstimate: MetricsEstimate = {
    loadComplexityBefore:
      parsedV1.metrics_estimate?.load_complexity_before ?? "medium",
    loadComplexityAfter:
      parsedV1.metrics_estimate?.load_complexity_after ?? "medium",
    maintainabilityBefore:
      parsedV1.metrics_estimate?.maintainability_before ?? "medium",
    maintainabilityAfter:
      parsedV1.metrics_estimate?.maintainability_after ?? "medium",
    notes: parsedV1.metrics_estimate?.notes
  };

  const calculatedRisk: BreakingRisk =
    parsedV1.changes && parsedV1.changes.length > 0
      ? parsedV1.changes.reduce<BreakingRisk>((acc, change) => {
        const level = change.risk_level;
        const rank: Record<BreakingRisk, number> = {
          none: 0,
          low: 1,
          medium: 2,
          high: 3
        };
        return rank[level] > rank[acc] ? level : acc;
      }, "none")
      : "low";

  const breakingRisk: BreakingRisk = parsedV1.breaking_risk || calculatedRisk;

  const safeToApply =
    validation.safe && (breakingRisk === "none" || breakingRisk === "low");

  const joinedWarnings =
    validation.warnings && validation.warnings.length > 0
      ? validation.warnings.join("\n")
      : "";

  const combinedNotes = [parsedV1.notes, joinedWarnings]
    .filter((x) => x && x.trim().length > 0)
    .join("\n\n");

  const result: OptimizeResult = {
    originalScript: script,
    optimizedScript,
    summary: parsedV1.summary || "",
    analysis: {
      changes,
      breakingRisk,
      safeToApply,
      mode,
      metricsEstimate,
      notes: combinedNotes || undefined
    },
    documentationMarkdown: parsedV1.documentation_markdown || ""
  };

  return result;
}
