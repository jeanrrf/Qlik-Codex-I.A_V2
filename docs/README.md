# 📚 Documentação - Qlik Codex I.A

## Índice Central

Bem-vindo à documentação completa do **Qlik Codex I.A**!

---

## 🚀 Para Começar

- [README Principal](../README.md) - Quick start e visão geral
- [Setup de Produção](PRODUCTION_SETUP.md) - Deploy em Turso + Render + Vercel
- [Checklist de Deploy](../DEPLOY_CHECKLIST.md) - Passo a passo detalhado

---

## 🏗️ Arquitetura & Estrutura

### Visão Geral
- [Guia de Agentes](../AGENTS.md) - Regras e guidelines do repositório
- [Banco de Dados](guides/DATABASE.md) - Estrutura SQLite/Turso

### Backend
- [Server README](../server/README.md) - Arquitetura Express + TypeScript
  - Rotas REST
  - Agentes AINEX
  - Serviços de negócio
  - Validadores Qlik

### Frontend
- [Web README](../web/README.md) - Arquitetura React + Vite
  - Componentes
  - Hooks customizados
  - Integração SSE
  - Sistema de tema

---

## ⚡ Features Avançadas

### Extreme Mode
- [Implementação](EXTREME_MODE_IMPLEMENTATION.md) - Documentação técnica completa
- [Formatador](EXTREME_MODE_FORMATTER.md) - Sistema de formatação de código
- [Exemplos](examples/) - Scripts de exemplo

---

## 🔧 Guias Técnicos

### Desenvolvimento
- [Banco de Dados](guides/DATABASE.md) - Estrutura e queries
- [Changelog - Login Fix](../CHANGELOG_LOGIN_FIX.md) - Correções recentes

### Deployment
- [Setup de Produção](PRODUCTION_SETUP.md) - Guia completo de deploy
- [Deploy Checklist](../DEPLOY_CHECKLIST.md) - Validações pré e pós-deploy

---

## 📂 Estrutura de Arquivos

```
docs/
├── README.md                           # Este arquivo
├── PRODUCTION_SETUP.md                 # Setup Turso + Render + Vercel
├── EXTREME_MODE_IMPLEMENTATION.md      # Extreme Mode - Implementação
├── EXTREME_MODE_FORMATTER.md           # Sistema de formatação
├── examples/
│   ├── EXTREME_MODE_EXAMPLES.qvs       # Exemplos de scripts
│   └── FORMATTING_TEMPLATE.qvs         # Template de formatação
└── guides/
    └── DATABASE.md                     # Estrutura do banco de dados
```

---

## 🔗 Links Rápidos

### GitHub
- **Repositório**: [jeanrrf/Qlik-Codex-I.A_V2](https://github.com/jeanrrf/Qlik-Codex-I.A_V2)
- **Branch Oficial**: `OFICIAL`
- **Branch Principal**: `main`

### APIs & Serviços
- [Google AI Studio](https://ai.google.dev/) - Gemini API
- [NVIDIA NIM](https://build.nvidia.com/) - LLMs alternativos
- [Turso](https://turso.tech/) - SQLite Cloud Database
- [Render](https://render.com/) - Backend hosting
- [Vercel](https://vercel.com/) - Frontend hosting

---

## 💡 Como Usar Esta Documentação

### Para Desenvolvedores
1. Comece pelo [README principal](../README.md) para setup local
2. Leia [Server README](../server/README.md) e [Web README](../web/README.md) para detalhes técnicos
3. Consulte [AGENTS.md](../AGENTS.md) para regras do repositório

### Para Deploy
1. Siga [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) passo a passo
2. Use [DEPLOY_CHECKLIST.md](../DEPLOY_CHECKLIST.md) para validações
3. Configure Turso, Render e Vercel conforme documentado

### Para Features Avançadas
1. Leia [EXTREME_MODE_IMPLEMENTATION.md](EXTREME_MODE_IMPLEMENTATION.md)
2. Veja exemplos em [examples/](examples/)
3. Consulte [DATABASE.md](guides/DATABASE.md) para estrutura de dados

---

## 📝 Contribuindo com a Documentação

Se encontrar erros ou tiver sugestões de melhoria:

1. Abra uma issue no GitHub
2. Faça um PR com correções
3. Mantenha o formato e estrutura existentes
4. Atualize este índice se adicionar novos docs

---

## 🔄 Última Atualização

**Data**: 11 de Dezembro de 2025  
**Versão**: 0.2.1

---

**Precisa de ajuda?** Abra uma issue no repositório ou consulte os READMEs específicos.
