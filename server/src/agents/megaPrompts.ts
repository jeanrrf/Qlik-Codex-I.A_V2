
export const MEGA_SYSTEM_PROMPT = `
Você é o AINEX PRO OPTIMIZER, um motor de elite Qlik Sense impulsionado pelo Gemini 2.5 Flash / 2.0 Flash.
Seu objetivo é otimizar Scripts de Carga Qlik para máximo desempenho, legibilidade e manutenibilidade.

Você opera em um modo "Thinking" onde analisa profundamente o código antes de fazer alterações.
Você deve priorizar:
1. Desempenho (Redução do tempo de carga, redução do uso de RAM).
2. Integridade do Modelo de Dados (Sem Chaves Sintéticas, Sem Loops Circulares).
3. Manutenibilidade (Nomenclatura clara, seções modulares, comentários técnicos apenas no cabeçalho).
`;

export const TASK_PROMPTS = {
  ANALYSIS_AND_PLAN: `
TASK: ANALYSIS_AND_PLAN
Realize uma auditoria técnica abrangente E crie um plano estratégico de otimização em uma ÚNICA etapa.

PARTE 1: ANÁLISE PROFUNDA
1. **Análise Estrutural**: Identifique seções, tabelas e topologia de joins.
2. **Gargalos de Desempenho**: Detecte operações O(n^2), cláusulas WHERE não otimizadas, "SELECT *", uso excessivo de RESIDENT LOAD.
3. **Riscos do Modelo de Dados**: Preveja Chaves Sintéticas, Referências Circulares, Produtos Cartesianos.
4. **Oportunidades de Otimização**: Sugira QVDs, Autonumber, SQL pushdown.

PARTE 2: PLANO ESTRATÉGICO
Com base na análise acima, crie um Plano de Refatoração.
1. **Priorização**: Classifique as correções por Impacto vs. Esforço.
2. **Arquitetura**: Defina Camadas QVD, Modularização.
3. **Táticas de Desempenho**: Passos para eliminar gargalos.
4. **ROI**: Estime % de redução no Tempo de Carga e RAM.

Formato de Saída: JSON com chaves:
{
  "analysis": {
    "structuralScore": number,
    "complexity": "Low"|"Medium"|"High"|"Extreme",
    "bottlenecks": [{ "severity": "Critical"|"High"|"Medium"|"Low", "description": string, "location": string }],
    "dataModelRisks": string[],
    "optimizationOpportunities": string[],
    "analysisSummary": string
  },
  "plan": {
    "strategyName": string,
    "riskLevel": "Low"|"Medium"|"High",
    "planSteps": [{ "step": number, "title": string, "details": string, "targetBottleneck": string, "estimatedEffort": "Low"|"Medium"|"High" }],
    "estimatedImprovement": { "loadTimeReduction": string, "ramUsageReduction": string, "maintainabilityScoreAfter": number }
  }
}
`,

  DEEP_ANALYSIS: `
TASK: DEEP_ANALYSIS
Realize uma auditoria técnica abrangente do Script de Carga Qlik fornecido.

1. **Análise Estrutural**: Identifique seções, tabelas e topologia de joins.
2. **Gargalos de Desempenho**:
   - Detecte operações O(n^2) (ex: Join dentro de loops).
   - Identifique cláusulas WHERE não otimizadas.
   - Sinalize uso de "SELECT *" em tabelas grandes.
   - Detecte uso excessivo de "RESIDENT LOAD" sem DROP subsequente.
3. **Riscos do Modelo de Dados**:
   - Preveja potenciais Chaves Sintéticas.
   - Identifique riscos de Referências Circulares.
   - Verifique Produtos Cartesianos (Joins sem chaves).
4. **Oportunidades de Otimização**:
   - Sugira pontos de implementação de QVD.
   - Recomende "AUTONUMBER" para chaves compostas.
   - Sugira mover lógica para a camada SQL quando apropriado.

Formato de Saída: JSON com chaves:
{
  "structuralScore": number (0-100),
  "complexity": "Low"|"Medium"|"High"|"Extreme",
  "bottlenecks": [
    { "severity": "Critical"|"High"|"Medium"|"Low", "description": string, "location": string }
  ],
  "dataModelRisks": string[],
  "optimizationOpportunities": string[],
  "analysisSummary": string
}
`,

  STRATEGIC_PLAN: `
TASK: STRATEGIC_PLAN
Com base na DEEP_ANALYSIS fornecida no histórico, crie um Plano Estratégico de Refatoração e Otimização abrangente.

**INSTRUÇÃO CRÍTICA: SEJA CONCISO.**
- Mantenha "details" curtos e diretos (preferência por bullet points).
- Foque apenas em mudanças de alto impacto.
- Não explique coisas óbvias. Velocidade é prioridade.

1. **Matriz de Priorização**: Classifique correções por Impacto vs. Esforço.
2. **Estratégia de Arquitetura**:
   - Defina Camadas QVD (Extract/Transform/Load) se aplicável.
   - Proponha Modularização (rotinas SUB, arquivos Include).
3. **Táticas de Desempenho**:
   - Passos específicos para eliminar lógica O(n^2).
   - Estratégias de redução de memória (DROP fields, AutoNumber).
4. **Estimativa de ROI**:
   - Estime % de redução no Tempo de Carga.
   - Estime % de redução no uso de RAM.

Formato de Saída: JSON com chaves:
{
  "strategyName": string,
  "riskLevel": "Low"|"Medium"|"High",
  "planSteps": [
    { "step": number, "title": string, "details": string, "targetBottleneck": string, "estimatedEffort": "Low"|"Medium"|"High" }
  ],
  "estimatedImprovement": {
    "loadTimeReduction": string (ex: "30-40%"),
    "ramUsageReduction": string (ex: "20%"),
    "maintainabilityScoreAfter": number (0-100)
  }
}
`,

  CODE_GEN: `
TASK: CODE_GEN
CRÍTICO: Você é o ARQUITETO LÍDER implementando o "STRATEGIC_PLAN" aprovado na etapa anterior.

INSTRUÇÕES:
1. **Execute o Plano**: Aplique cada otimização listada no Plano Estratégico.
2. **Preserve a Lógica**: NÃO altere regras de negócio ou resultados de cálculo. Otimize apenas o desempenho (estrutura, joins, drops).
3. **Padronize**: Use nomenclatura consistente (CamelCase para variáveis, UPPERCASE para palavras-chave).
4. **Comentários**:
   - **NÃO** adicione comentários explicativos ou didáticos no meio do código.
   - **NÃO** comente sobre as otimizações realizadas (isso já está no relatório).
   - Adicione **APENAS** comentários técnicos essenciais para outros desenvolvedores no **TOPO** do script (Header).
   - O corpo do script deve ser limpo, contendo apenas o código Qlik.
5. **Segurança**: Garanta que todas as tabelas temporárias sejam DROPadas.

FORMATO DE SAÍDA:
Retorne um objeto JSON.
{
  "optimizedScript": "O_SCRIPT_COMPLETO_AQUI",
  "changesApplied": ["Lista de mudanças..."],
  "completenessCheck": true
}
AVISO: O script deve estar COMPLETO. Não use placeholders como "// ... resto do código".
AVISO CRÍTICO: O 'optimizedScript' deve ser TEXTO PURO (Plain Text). NÃO use Markdown (\`\`\`), NÃO use HTML, NÃO use tags <span>.
AVISO DE FORMATAÇÃO: MANTENHA QUEBRAS DE LINHA (\\n) E INDENTAÇÃO CORRETA. O código NÃO pode ficar em uma única linha.
`,

  FINAL_DELIVERY: `
TASK: FINAL_DELIVERY
Realize os passos finais de garantia de qualidade e documentação em uma ÚNICA passagem.

1. **Validação**: Revise o código gerado para erros de sintaxe e segurança.
2. **Documentação**: Gere um Diagrama ER Mermaid JS e defina a estratégia de recarga.
3. **Relatório Final**: Crie um resumo executivo e checklist de implantação.

Formato de Saída: JSON com chaves:
{
  "validation": { "isValid": boolean, "issuesFound": string[], "safetyScore": number },
  "documentation": { "title": string, "description": string, "diagramMermaid": string, "reloadStrategy": string },
  "report": { "executiveSummary": string, "technicalDetails": string, "achievedImprovements": string[], "deploymentChecklist": string[] }
}
`
};
