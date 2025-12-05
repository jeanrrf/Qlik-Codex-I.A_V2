# Qlik Codex I.A - Frontend

Interface web moderna para o otimizador de scripts Qlik.

## Tecnologias
- **React 18** com TypeScript
- **Vite** para build e dev server
- **CSS Modules / Vanilla CSS** para estilização (tema escuro, glassmorphism)

## Estrutura
- `src/pages`: Páginas principais (Landing, OptimizerV2)
- `src/components`: Componentes reutilizáveis (ConsultancyDocumentViewer, ScriptAnalysisInfo, etc.)
- `src/hooks`: Hooks customizados (useSessionPersistence, useOptimizationProgress)
- `src/types`: Definições de tipos compartilhados com o backend

## Funcionalidades
- **Upload de Arquivo**: Suporte a .qvs, .txt e detecção de .qvd (cabeçalho).
- **Editor de Script**: Visualização e edição rápida.
- **Modos de Otimização**: Conservador (seguro) e Agressivo (reestruturação).
- **Painel de Resultados**:
  - Risco de quebra (Breaking Risk)
  - Métricas qualitativas (Complexidade, Manutenibilidade)
  - Lista de mudanças detalhada
  - Documentação gerada por IA
- **Consultoria**: Geração de documento PDF/Markdown com análise profunda.

### Visual diff alinhado (novo)
- A visualização de "Comparação de Código" no documento de consultoria agora mostra um diff alinhado por linha (estilo git diff) — linhas adicionadas, removidas e modificadas aparecem lado a lado, sincronizadas por número de linha para facilitar a revisão humana.
  - Além disso o diff agora tenta detectar mudanças intra-linha (marcando trechos removidos/ inseridos) para facilitar revisão fina.
  - Também é possível exportar o diff como arquivo (.diff) para revisão externa/integração com processos git.
  

## Como Rodar
```bash
npm install
npm run dev
```
O frontend deve rodar em conjunto com o backend (server) para funcionar plenamente.
