# Qlik Codex I.A — AINEX Pipeline

Sistema inteligente de otimização de scripts Qlik usando **AINEX** (AI Next-Generation Expert) com rotação multi-provider (Google Gemini + NVIDIA).

## 🚀 Quick Start

### Development Mode
```bash
npm install
npm run start:dev  # Inicia server (3000) + web (5173)
```

### Production Build
```bash
npm install --production
npm run build  # Compila server + web
cd server && npm start  # Servidor serve frontend em http://localhost:3000
```

## 📦 Arquitetura

- **Backend**: Express + TypeScript (`server/`)
- **Frontend**: React + Vite (`web/`)
- **AI**: Multi-agent AINEX (qlikOptimizeAgent, qlikReviewAgent, qlikExplainAgent)
- **Database**: SQLite (`server/data/qlik-codex.db`)
- **Auth**: Google OAuth 2.0

## 🔧 Environment Setup

1. Copiar `server/.env.example` para `server/.env`
2. Configurar chaves de API:
   - `GEMINI_API_KEY` (obter em https://ai.google.dev/)
   - `NVIDIA_API_KEY` (obter em https://build.nvidia.com/)
   - `LLM_PROVIDERS=google,nvidia`
3. Configurar Google OAuth:
   - `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
   - Callback URL: `http://localhost:3000/api/auth/google/callback`

## 📚 Documentação

📖 **[Índice Completo de Documentação](docs/README.md)**

### Quick Links
- [Arquitetura Backend](server/README.md) - Express + TypeScript
- [Arquitetura Frontend](web/README.md) - React + Vite
- [Banco de Dados](docs/guides/DATABASE.md) - SQLite/Turso
- [Setup de Produção](docs/PRODUCTION_SETUP.md) - Turso + Render + Vercel
- [Deploy Checklist](DEPLOY_CHECKLIST.md) - Passo a passo completo
- [Regras do Repositório](AGENTS.md) - Guidelines e padrões

## 🎯 Features Principais

### AINEX Pipeline
- **Análise Profunda**: Script analysis com detecção de padrões
- **Otimização Multi-Agente**: qlikOptimizeAgent + qlikReviewAgent
- **Validação Rigorosa**: Detecta SQL proibido, funções hallucinated, riscos
- **Provider Rotation**: Fallback automático Google → NVIDIA

### ROI Calculator
- Converte métricas técnicas em valor monetário
- Executive summary para justificativa de investimento
- Cálculo de economia de tempo, manutenção e performance

### Real-Time Progress
- SSE (Server-Sent Events) para progresso em tempo real
- Tracking de steps, substeps e chunks
- Script analysis e chunking progress visual

### Consultoria Profissional
- Documento completo de consultoria técnica
- Timeline de execução, métricas, recomendações
- Code comparison com markers visuais

## 🛠️ Scripts Disponíveis

### Root (Monorepo)
- `npm run start:dev` - Dev mode (server + web)
- `npm run server:dev` - Apenas backend
- `npm run web:dev` - Apenas frontend
- `npm run kill` - Mata portas 3000 e 5173

### Server
- `npm run dev` - Dev mode com hot reload
- `npm run build` - Build TypeScript → dist/
- `npm start` - Executa build produção
- `npm test` - Roda testes (Vitest)
- `npm run lint` - ESLint flat config
- `npm run typecheck` - Verificação TypeScript

### Web
- `npm run dev` - Vite dev server (5173)
### Troubleshooting common dev issues

- ECONNREFUSED / proxy errors when hitting /api from the frontend dev server:
   - Cause: the frontend dev server proxies `/api` calls to `http://localhost:3000` by default. If the backend is not running, Vite's proxy used to emit many ECONNREFUSED stack traces.
   - Fix: start both apps together from the repo root: `npm run start:dev`. If you intentionally run only the frontend, the dev server now returns a friendly 502 JSON when the backend is unreachable (see `web/vite.config.ts`).

   CI: The repository contains a GitHub Actions workflow that runs checks for missing form `id/name` and runs the `web` ESLint rules on PRs to `main`/`main_ofc` to reduce regressions.

- `npm run build` - Build produção → dist/
- `npm run preview` - Preview build local
- `npm run lint` - ESLint

## 📊 Estrutura do Projeto

```
Qlik Codex I.A/
├── server/              # Backend TypeScript
│   ├── src/
│   │   ├── agents/      # AINEX agents
│   │   ├── services/    # Business logic
│   │   ├── routes/      # Express routes
│   │   ├── validators/  # Zod schemas + Qlik heuristics
│   │   ├── lib/         # Infrastructure (DB, LLM, config)
│   │   ├── middleware/  # Error handling, auth, rate limit
│   │   └── types/       # TypeScript types
│   ├── data/            # SQLite database
│   └── test/            # Vitest tests
│
├── web/                 # Frontend React
│   ├── src/
│   │   ├── pages/       # LandingPage, OptimizerPageV2
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── api/         # API clients
│   │   ├── lib/         # Utils (qlik formatter, syntax highlighter)
│   │   ├── contexts/    # React contexts (AuthContext)
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
│
├── docs/                # Documentação técnica
├── tools/               # Scripts utilitários
└── .github/             # GitHub configs + instructions
```

## 🔐 Sistema de Autenticação

- Google OAuth 2.0 integration
- JWT tokens (access + refresh)
- Role-based permissions (ADMIN, POWER_USER, USER)
- Usage limits por role
- Session management com SQLite

## 🧪 Testing

```bash
cd server
npm test              # Roda todos os testes
npm test -- --watch   # Watch mode
```

Fixtures disponíveis em `server/test/fixtures/` para testes de agentes.

## 🚀 Production Deployment

Ver [PRODUCTION.md](PRODUCTION.md) para checklist completo.

**Requisitos mínimos:**
- Node.js 18+
- SQLite 3
- 512MB RAM
- API keys (Gemini obrigatório, NVIDIA opcional)

## 🤝 Contribuindo

1. Fork o repositório
2. Crie feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT

## 🔗 Links

- **Repositório**: https://github.com/jeanrrf/Qlik-Codex-I.A-pro
- **Google AI Studio**: https://ai.google.dev/
- **NVIDIA NIM**: https://build.nvidia.com/

---

**Versão**: 0.2.1  
**Última Atualização**: Dezembro 2025
