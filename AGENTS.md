# Repository Guidelines

## Project Structure & Module Organization
- Root contains `package.json`, `build_all.py`/`build-all.bat`, `run_project.py`, and shared dirs such as `data/`, `docs/`, `.github/`, and `tools/`.
- `server/` is the Express + TypeScript backend with `routes/`, `services/`, `agents/`, `validators/`, `middleware/`, `lib/`, `types/`, `data/`, and Vitest specs in `test/`.
- `web/` is the React + Vite frontend; keep UI code in `src/pages`, `components`, `hooks`, `contexts`, `api`, `lib`, and `types`, with static assets in `public/`.

## Build, Test, and Development Commands
- Root: `npm install`, `npm run start:dev` (server + web), `npm run server:dev`, `npm run web:dev`, `npm run kill` (ports 3000/5173).
- Server: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm run kill` (port 3000).
- Web: `npm run dev`, `npm run build`, `npm run preview`, `npm run lint`, `npm run check:form-ids`, `npm run kill` (port 5173); `check:form-ids` mirrors the GitHub workflow that validates form inputs.

## Coding Style & Naming Conventions
- TypeScript is the common language; ESLint (flat config) paired with Prettier keeps formatting consistent—run each package’s `npm run lint` before committing.
- Use `camelCase` for helpers/services and `PascalCase` for React components/hooks; keep the `agents/` folder for automation actors and `services/` for domain logic.
- Tests and helpers in `server/test/` follow the `*.spec.ts` suffix so Vitest picks them up automatically.

## Testing Guidelines
- Backend tests use Vitest: `cd server && npm test` (or `npm test -- --watch` for rapid feedback). Fixtures live in `server/test/fixtures/`.
- Describe each suite by the service or agent under test and avoid mutating production SQLite data directly.

## Commit & Pull Request Guidelines
- Commit messages follow conventional prefixes (`feat:`, `refactor:`, `chore:`, etc.); keep the summary short, add a body when needed, and push from a feature branch (`feature/...` or `fix/...`).
- PRs must explain what changed, list the scripts/tests that were run (build, lint, unit tests), and link related issues or docs; include verification steps or screenshots for UI work.
- Before merge, ensure the relevant build/lint/test commands pass locally and mention any SSE, quota, or schema updates in `docs/`.

## Environment & Configuration Tips
- Copy `server/.env.example` to `server/.env` and fill the provider/API keys (`GEMINI_API_KEY`, `NVIDIA_API_KEY`, `GOOGLE_CLIENT_ID`, etc.) plus `LLM_PROVIDERS`.
- Keep local data in `server/data/qlik-codex.db`, document schema tweaks in `docs/`, and reuse helper scripts from `tools/` when touching forms or deployments.
