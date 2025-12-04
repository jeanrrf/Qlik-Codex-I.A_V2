import { OptimizationStepId, OPTIMIZATION_STEPS, OptimizationStep } from "../types/optimization";

export interface KnowledgeBaseEntry {
  instruction: string;
  context: string;
  validationCriteria: string[];
  examples?: {
    description: string;
    bad: string;
    good: string;
  }[];
}

/**
 * Base de Conhecimento Inteligente para Otimização Qlik
 * Mapeia cada uma das 112 etapas para instruções precisas de engenharia de prompt.
 */
export class QlikOptimizationKnowledgeBase {

  private static categoryContexts: Record<string, string> = {
    "pre_validation": "Você está na fase de PRÉ-VALIDAÇÃO. Seu objetivo é garantir que o script seja seguro, sintaticamente correto e compreensível antes de qualquer alteração profunda. Não faça otimizações de performance ainda, apenas diagnósticos e correções de integridade básica.",
    "structural_analysis": "Você está na fase de ANÁLISE ESTRUTURAL. Seu foco é entender o modelo de dados, a linhagem dos campos e as dependências entre tabelas. Identifique problemas de modelagem como chaves sintéticas, referências circulares e produtos cartesianos.",
    "performance": "Você está na fase de OTIMIZAÇÃO DE PERFORMANCE. Agora é o momento de aplicar técnicas avançadas para reduzir tempo de carga e consumo de memória. Foco em: SQL Pushdown, Exists(), Autonumber(), QVDs e eliminação de gargalos.",
    "quality": "Você está na fase de QUALIDADE DE CÓDIGO. Seu objetivo é tornar o script legível, padronizado e manutenível. Aplique convenções de nomenclatura, indentação e comentários claros.",
    "post_validation": "Você está na fase de VALIDAÇÃO PÓS-OTIMIZAÇÃO. Verifique se as alterações anteriores não quebraram a lógica de negócio, a integridade dos dados ou a segurança. Garanta que o resultado final seja funcional.",
    "result_generation": "Você está na fase de GERAÇÃO DE RESULTADOS. Compile as alterações, gere documentação, diffs e relatórios finais para o usuário."
  };

  private static customEntries: Partial<Record<OptimizationStepId, KnowledgeBaseEntry>> = {
    // --- PRÉ-VALIDAÇÃO ---
    "pre_001_parse_script_syntax": {
      instruction: "Analise o script Qlik fornecido em busca de erros de sintaxe fatais. Verifique parênteses não fechados, vírgulas ausentes em listas de campos, aspas não fechadas e palavras-chave mal formadas.",
      context: "O script deve ser válido para ser processado. Erros aqui impedem qualquer otimização.",
      validationCriteria: [
        "Todas as instruções terminam com ponto e vírgula (exceto controle de fluxo)",
        "Parênteses e aspas estão balanceados",
        "Comandos LOAD e SELECT estão estruturados corretamente"
      ]
    },
    "pre_005_detect_sql_blocks": {
      instruction: "Identifique blocos que iniciam com 'SQL SELECT' ou 'SQL EXEC'. Mapeie a conexão utilizada e verifique se há mistura de lógica Qlik dentro da string SQL (o que seria um erro, exceto via variáveis).",
      context: "Blocos SQL são executados no banco de dados. O Qlik apenas recebe o resultado.",
      validationCriteria: [
        "Identificar corretamente o início e fim de blocos SQL",
        "Não confundir LOAD precedendo SQL com o próprio SQL"
      ]
    },
    "pre_013_security_scan": {
      instruction: "Escaneie o script por vulnerabilidades de segurança, como credenciais hardcoded (senhas, tokens), caminhos de arquivo absolutos inseguros ou Section Access mal configurado.",
      context: "Segurança é prioridade zero. Credenciais nunca devem estar no script.",
      validationCriteria: [
        "Nenhuma senha em texto plano encontrada",
        "Section Access (se houver) deve ter USERID e PASSWORD ou NTNAME",
        "Caminhos de lib:// são preferidos sobre caminhos absolutos (C:\\...)"
      ]
    },

    // --- ANÁLISE ESTRUTURAL ---
    "struct_021_synthetic_key_analysis": {
      instruction: "Analise o modelo de dados resultante para detectar Chaves Sintéticas ($Syn). Identifique tabelas que compartilham dois ou mais campos com o mesmo nome.",
      context: "Chaves sintéticas geralmente indicam erro de modelagem ou falta de qualificação de campos. Elas consomem memória e CPU excessivas.",
      validationCriteria: [
        "Listar todas as tabelas envolvidas em chaves sintéticas",
        "Identificar os campos causadores",
        "Propor solução (Rename, Qualify, Link Table ou Concatenate)"
      ]
    },
    "struct_022_circular_reference_check": {
      instruction: "Verifique se há ciclos no grafo de dependência das tabelas (Tabela A -> Tabela B -> Tabela C -> Tabela A).",
      context: "Referências circulares causam loops no Qlik e podem fazer a carga falhar ou gerar dados inconsistentes.",
      validationCriteria: [
        "Detectar ciclos fechados no modelo",
        "Sugerir quebra do ciclo via Rename, Concatenate ou Link Table"
      ]
    },

    // --- PERFORMANCE ---
    "perf_031_exists_function_analysis": {
      instruction: "Analise cláusulas WHERE que filtram dados baseados em campos já carregados. Substitua 'Campo IN (...)' ou joins lentos por 'Exists(Campo)'.",
      context: "Exists() é uma das funções mais rápidas do Qlik para filtragem baseada em dados já carregados.",
      validationCriteria: [
        "Identificar WHERE clauses lentas",
        "Verificar se o campo filtro já foi carregado anteriormente",
        "Aplicar Exists(CampoOriginal, CampoFiltro) corretamente"
      ],
      examples: [
        {
          description: "Otimização de filtro com Exists",
          bad: "Load * From Tabela.qvd Where ID = 1 or ID = 2;",
          good: "Load * From Tabela.qvd Where Exists(ID);"
        }
      ]
    },
    "perf_036_sql_pushdown_opportunities": {
      instruction: "Identifique transformações (cálculos, filtros, agregações) que estão sendo feitas no Qlik (LOAD) mas poderiam ser movidas para o SQL (SELECT).",
      context: "O banco de dados geralmente é mais eficiente para filtrar e agregar antes de trafegar os dados pela rede.",
      validationCriteria: [
        "Mover WHERE clauses para o SQL sempre que possível",
        "Mover agregações (SUM, COUNT) para o SQL se o detalhe não for necessário",
        "Manter funções específicas do Qlik (Mapping, ApplyMap) no Qlik"
      ]
    },
    "perf_055_resident_to_sql": {
      instruction: "Verifique se há cargas RESIDENT que apenas filtram ou ordenam dados que poderiam ter sido tratados na carga original ou via SQL.",
      context: "RESIDENT LOAD é single-threaded e bloqueia a tabela origem. Evite se possível.",
      validationCriteria: [
        "Eliminar RESIDENT desnecessário",
        "Consolidar lógica na primeira passagem de leitura"
      ]
    },

    // --- QUALIDADE ---
    "quality_066_naming_conventions": {
      instruction: "Verifique se os nomes de tabelas e campos seguem o padrão CamelCase ou snake_case de forma consistente. Tabelas temporárias devem começar com 'TMP_' ou '_'.",
      context: "Consistência facilita a manutenção.",
      validationCriteria: [
        "Tabelas temporárias identificadas",
        "Campos chaves identificados (ex: %Key, ID_...)"
      ]
    },
    "quality_072_remove_dead_code": {
      instruction: "Identifique e remova variáveis definidas mas não usadas, tabelas carregadas e dropadas sem uso (exceto se gerarem QVDs ou CSVs), e seções de código comentadas que são obsoletas.",
      context: "Código morto polui o script e confunde a manutenção.",
      validationCriteria: [
        "Não remover código que gera efeitos colaterais necessários (ex: Store)",
        "Remover variáveis não referenciadas",
        "Remover tabelas que não se conectam e não são armazenadas"
      ]
    }
  };

  /**
   * Obtém a entrada da base de conhecimento para uma etapa específica.
   * Se não houver entrada customizada, gera uma genérica baseada nos metadados da etapa.
   */
  public static getEntry(stepId: OptimizationStepId): KnowledgeBaseEntry {
    const step = OPTIMIZATION_STEPS.find(s => s.id === stepId);
    if (!step) {
      // Fallback de segurança se o ID não existir na lista (não deveria acontecer)
      return {
        instruction: `Execute a etapa de otimização: ${stepId}.`,
        context: "Siga as melhores práticas de desenvolvimento Qlik Sense.",
        validationCriteria: ["O script deve permanecer funcional."]
      };
    }

    const custom = this.customEntries[stepId];
    if (custom) {
      return {
        ...custom,
        // Garante que o contexto da categoria seja anexado se não houver um específico ou para complementar
        context: custom.context ? `${this.categoryContexts[step.category]} ${custom.context}` : this.categoryContexts[step.category]
      };
    }

    // Geração dinâmica para etapas sem definição manual explícita
    return this.generateDefaultEntry(step);
  }

  private static generateDefaultEntry(step: OptimizationStep): KnowledgeBaseEntry {
    const categoryContext = this.categoryContexts[step.category] || "";

    return {
      instruction: `Execute a tarefa: "${step.name}". Descrição: ${step.description}. Analise o script e aplique as alterações necessárias para cumprir este objetivo específico.`,
      context: `${categoryContext} Esta etapa é classificada como '${step.critical ? 'CRÍTICA' : 'OPCIONAL'}' e tem um timeout de ${step.timeout}ms.`,
      validationCriteria: [
        "O script deve continuar executável após a alteração",
        "A lógica de negócio original deve ser preservada",
        `O objetivo "${step.name}" deve ser atingido`
      ]
    };
  }

  /**
   * Gera o prompt completo para ser enviado ao LLM para uma etapa específica
   */
  public static buildPrompt(stepId: OptimizationStepId, scriptContent: string, metadata?: any): string {
    const entry = this.getEntry(stepId);
    const step = OPTIMIZATION_STEPS.find(s => s.id === stepId);

    let prompt = `
# TAREFA DE OTIMIZAÇÃO QLIK: ${step?.name || stepId}
ID: ${stepId}

## CONTEXTO
${entry.context}

## INSTRUÇÃO
${entry.instruction}

## CRITÉRIOS DE VALIDAÇÃO
${entry.validationCriteria.map(c => `- ${c}`).join('\n')}
`;

    if (entry.examples && entry.examples.length > 0) {
      prompt += `\n## EXEMPLOS\n`;
      entry.examples.forEach(ex => {
        prompt += `
### ${ex.description}
**ANTES (Ruim):**
\`\`\`qlik
${ex.bad}
\`\`\`

**DEPOIS (Bom):**
\`\`\`qlik
${ex.good}
\`\`\`
`;
      });
    }

    if (metadata) {
      prompt += `\n## METADADOS ADICIONAIS\n${JSON.stringify(metadata, null, 2)}\n`;
    }

    prompt += `\n## SCRIPT ORIGINAL\n\`\`\`qlik\n${scriptContent}\n\`\`\`\n`;

    prompt += `\n## RESPOSTA ESPERADA
Retorne APENAS o código Qlik otimizado/corrigido para esta etapa específica.
Se nenhuma alteração for necessária, retorne o código original exatamente como está.
Não inclua explicações em texto fora dos comentários do código.
`;

    return prompt;
  }
}
