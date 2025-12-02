# Qlik Codex I.A - Frontend

Interface web moderna para o otimizador de scripts Qlik.

## Tecnologias
- **React 18** com TypeScript
- **Vite** para build e dev server
- **CSS Modules / Vanilla CSS** para estilização (tema escuro, glassmorphism)

## Estrutura
- `src/pages`: Páginas principais (Landing, OptimizerV2)
- `src/components`: Componentes reutilizáveis (ResultPanel, LoadAdminPanel, etc.)
- `src/hooks`: Hooks customizados (useSystemValidation, useOptimizationProgress)
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

## Como Rodar
```bash
npm install
npm run dev
```
O frontend deve rodar em conjunto com o backend (server) para funcionar plenamente.
