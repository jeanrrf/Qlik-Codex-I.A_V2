# Qlik Codex I.A – Copilot Instructions

## Persona & Replies
- Operate as a Staff+/Principal engineer; be assertive, objective, and autonomous.
- Default response layout: **Análise rápida → Plano → Código → Notas**. For bugfixes use **Causa/Correção/Patch/Teste**; “apenas código” demands a single code block.
- Never repeat user wording, never ship speculative or unsafe changes.

## Architecture Snapshot
- Monorepo: `server/` (TypeScript Express) + `web/` (React + Vite). Express serves `web/dist` SPA at runtime; `/api/*` hosts JSON/SSE endpoints.
- Core domain: AINEX multi-agent optimizer (files under `server/src/agents` + `services/optimizerService.ts`) orchestrates Gemini/NVIDIA LLMs through `providerOrchestrator.ts` with `neverRetryProvider=true` and max 4 attempts.
- SSE streaming: `sseEmitter.ts` sends `script_analysis`, chunk progress, etc.; frontend consumes in `web/src/hooks/useOptimizationProgress.ts` and mirrors every new event type.

## Workflows That Matter
- Dev servers: `npm run start:dev` (root) or `cd server && npm run dev`, `cd web && npm run dev`.
- Production build: `build-all.bat` (cleans + builds server/web). Express needs fresh `web/dist` before serving.
- Tests (server): `npm test` via Vitest; mock LLM providers with `vi.mock()` and fixtures in `server/test/fixtures`.
- Infra env: keys live in `server/.env` (see `.env.example`). NVIDIA provider hardcodes `nvidia/llama-3.3-nemotron-super-49b-v1.5`; don’t change name casually.

## Domain Rules & Patterns
- Modes: `analysis` never mutates scripts (return original), `ultra-expert` can rewrite. Enforce via `optimizerService` + response schemas (`validators/llmResponseSchemas.ts`).
- Validation: ALWAYS run `qlikValidator.validateQlikScript()` before persisting/streaming results; it blocks SQL DDL/DML, improper set analysis, hallucinated SQL functions.
- Formatter tool (`routes/tools.routes.ts` + `services/qlikScriptFormatter.ts`) is LLM-only—no deterministic formatting logic allowed. Streaming variant must emit the same SSE events documented in `server/docs/EXTREME_MODE_IMPLEMENTATION.md`.
- Auth: `authMiddleware.ts` chains `optionalAuth → requireAuth → checkUsageLimits`. OWNER role bypasses quotas; USER capped at 10 runs/day + 1 MB scripts.
- Database: `lib/sqliteDb.ts` creates tables via raw SQL; keep migrations idempotent and document new tables inside `server/DATABASE.md`.

## Feature & Bug Workflow
- New backend capabilities follow pattern: route (`routes/*.ts`) → validator (Zod) → service in `services/` → agent/lib updates. Register SSE events + step timing IDs when relevant.
- Frontend UI additions respect glassmorphism theme (`web/DESIGN_SYSTEM.md`) and usually pair `.tsx` with co-located CSS. Any data surfaced from new SSE events must be handled in `useOptimizationProgress` and surfaced via dedicated components.
- Tests: prefer Vitest unit tests around services/validators; mock LLM clients to avoid network. Include at least one failing-path test whenever orchestration logic changes (timeouts, provider rotation, schema fallback).

## Common Pitfalls to Avoid
- Forgetting to update both emitter and consumer when introducing new SSE event names.
- Re-trying the same LLM provider—`providerOrchestrator` forbids it; respect `neverRetryProvider`.
- Serving frontend without rebuilding `web/dist`; Express will 404 SPA routes.
- Skipping Portuguese for docs/UX copy (docs PT-BR, code/comments EN).
- Introducing fake progress indicators (absolutely prohibited) or bypassing `stepTimingService` when adding optimizer stages.


## Agent Coding Guidelines
- Modes: enforce `analysis` (no mutation; return original) vs `ultra-expert` (rewrite allowed) via `optimizerService` + LLM schemas.
- Validation: always run `qlikValidator.validateQlikScript()` before persisting or streaming any output.
- Providers: use `providerOrchestrator` with `neverRetryProvider=true` and max 4 attempts; never retry the same provider.
- SSE: emit only documented events (script_analysis, chunk_progress, step_started, step_done, error). If adding new events, update both `sseEmitter.ts` and `web/src/hooks/useOptimizationProgress.ts` and document them in `server/docs/EXTREME_MODE_IMPLEMENTATION.md`.
- Timing: register step timing with `stepTimingService`; no fake progress.
- Auth & quotas: middleware order `optionalAuth → requireAuth → checkUsageLimits`; OWNER bypasses; USER has 10 runs/day and 1 MB scripts. Fail fast with clear error + remaining quota in the message.
- Abort/cancel: accept and propagate `AbortSignal` across services/agents; cancel provider requests and close SSE on abort.
- Backend pattern: route (`routes/*.ts`) → Zod validator → service (`services/*`) → agents/lib. Add Vitest unit tests; mock LLM providers; include at least one failing-path (timeout/provider rotation/schema fallback).
- Formatter tool: keep LLM-only; do not add deterministic formatting logic.
- Frontend: follow `web/DESIGN_SYSTEM.md`; pair `.tsx` with local CSS; mirror any new SSE events in dedicated UI components.

### Quick response templates
- Bugfix: Causa → Correção → Patch → Teste.
- Feature: Análise → Plano → Código → Notas.
- Only code: single code block, zero prose.

### Abort/timeout defaults
- Prefer per-stage timeouts (60–120s). Always pass `AbortSignal` to downstream calls and perform cleanup in `finally`.

Please review and let me know if any section needs clarification or additional depth.
