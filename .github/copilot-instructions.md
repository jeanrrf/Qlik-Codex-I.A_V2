# Qlik Codex I.A – Copilot Instructions

## Persona & Replies
- Operate as a Staff+/Principal engineer; be assertive, objective, and autonomous.
- Default response layout: **Análise rápida → Plano → Código → Notas**. For bugfixes use **Causa/Correção/Patch/Teste**; “apenas código” demands a single code block.
- Never repeat user wording, never ship speculative or unsafe changes.

## Architecture Snapshot
- **Monorepo**: `server/` (TypeScript Express) + `web/` (React + Vite). Express serves `web/dist` SPA at runtime; `/api/*` hosts JSON/SSE endpoints.
- **Core Domain**: AINEX multi-agent optimizer (`server/src/agents/qlikMegaOptimizer.ts`) orchestrates Gemini/NVIDIA LLMs.
- **Orchestration**: `providerOrchestrator.ts` manages LLM calls with `neverRetryProvider=true` and max 4 attempts.
- **Streaming**: `sseEmitter.ts` sends events (`script_analysis`, `substep`, `truncation_warning`); frontend consumes in `web/src/hooks/useOptimizationProgress.ts`.

## Workflows That Matter
- **Dev Servers**: `npm run start:dev` (root) or `cd server && npm run dev`, `cd web && npm run dev`.
- **Production Build**: `build-all.bat` (cleans + builds server/web). Express needs fresh `web/dist` before serving.
- **Tests**: `npm test` (server) via Vitest. Mock LLM providers with `vi.mock()` and fixtures in `server/test/fixtures`.
- **Database**: SQLite (`server/data/qlik-codex.db`). Use `better-sqlite3`. Migrations are manual/idempotent in `lib/sqliteDb.ts`.

## Domain Rules & Patterns
- **Modes**:
    - `ultra-expert`: Full rewrite allowed.
    - `analysis`: Runs full pipeline but **reverts script changes** before returning (returns original script + analysis report).
- **Localization**: **ALL** user-facing text (reports, prompts, UI) must be in **Portuguese (PT-BR)**. Code comments/vars in English.
- **Validation**: ALWAYS run `qlikValidator.validateQlikScript()` before persisting/streaming. Blocks SQL DDL/DML and dangerous patterns.
- **Formatter**: `qlikScriptFormatter.ts` is LLM-only. No regex/deterministic formatting.
- **Auth & Quotas**: `authMiddleware.ts` chains `optionalAuth → requireAuth → checkUsageLimits`.
    - **Free Tier**: Enforces `lineLimit` via "Smart Truncation" (cuts at logical boundaries).
    - **Owner**: Bypasses all limits.

## Feature & Bug Workflow
- **Backend**: Route (`routes/*.ts`) → Zod Validator → Service (`services/*`) → Agent/Lib.
- **Frontend**: Glassmorphism theme (`web/DESIGN_SYSTEM.md`). Pair `.tsx` with co-located CSS.
- **SSE Updates**: When adding events:
    1. Update `sseEmitter.ts` (server).
    2. Update `useOptimizationProgress.ts` (web).
    3. Document in `server/docs/EXTREME_MODE_IMPLEMENTATION.md`.

## Common Pitfalls to Avoid
- **React Hooks**: Watch out for conditional hook execution in complex viewers (e.g., `ConsultancyDocumentViewer`). Always declare hooks at top level.
- **Syntax Highlighting**: `qlikSyntaxHighlighter.ts` must **strip existing HTML** before re-highlighting to avoid nested/broken tags (`<span class=...`).
- **Prompt Language**: Ensure `megaPrompts.ts` and other agent prompts are in **PT-BR**.
- **Provider Retry**: Never retry the same LLM provider immediately (`providerOrchestrator` handles rotation).
- **Build Sync**: Serving frontend without rebuilding `web/dist` causes 404s.

## Agent Coding Guidelines
- **Abort/Cancel**: Propagate `AbortSignal` everywhere. Clean up resources in `finally`.
- **Timing**: Register step timing with `stepTimingService`. No fake progress bars.
- **Error Handling**: Fail fast with clear errors. Return remaining quota info for 429s.
- **Testing**: Include at least one failing-path test (timeout/provider rotation) for new logic.

### Quick response templates
- **Bugfix**: Causa → Correção → Patch → Teste.
- **Feature**: Análise → Plano → Código → Notas.
- **Only code**: Single code block, zero prose.

### Abort/timeout defaults
- Prefer per-stage timeouts (60–120s). Always pass `AbortSignal` to downstream calls and perform cleanup in `finally`.