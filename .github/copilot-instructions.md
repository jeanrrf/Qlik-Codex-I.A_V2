# Qlik Codex I.A — AI Agent Instructions

This is a TypeScript monorepo containing a React frontend and an Express backend with AI agents for Qlik script optimization.

## 🏗 Architecture & Core Flow

- **Monorepo Structure**:
  - `server/`: Express backend, AI agents, validators.
  - `web/`: React + Vite frontend.
- **Entry Point**: `server/src/index.ts` serves API and static frontend assets.
- **Main Flow**: `POST /api/scripts/optimize` -> `scriptService` -> `optimizerService` -> `qlikOptimizeAgent` -> `llmClient`.
- **AI Core**:
  - `server/src/agents/qlikOptimizeAgent.ts`: Contains the **Super Prompt** and orchestration logic.
  - `server/src/lib/llmClient.ts`: Handles LLM providers (Google Gemini, Nvidia) with fallback logic.
  - `server/src/validators/llmResponseSchemas.ts`: Zod schemas for strict JSON validation of LLM outputs.

## 🤖 AI Agent Development Rules

### 1. Prompt Engineering & LLM Integration
- **Super Prompt**: The master prompt is in `server/src/agents/qlikOptimizeAgent.ts`. **NEVER** modify it without understanding the JSON schema requirements.
- **Strict JSON**: The LLM **MUST** return valid JSON. The agent enforces this via `LLMSchemaV1`.
- **Language**: All prompts and AI responses must be in **Portuguese (PT-BR)**.
- **Fallback**: If the LLM fails or returns invalid JSON, the system falls back to the original script with a "high risk" warning.

### 2. Critical Validation Rules (`validators/qlikValidator.ts`)
- **SQL Safety**: SQL commands (`CREATE`, `DROP`, `INSERT`, etc.) are **FORBIDDEN** outside of `SQL ... ;` blocks.
- **Logic Preservation**: The optimizer must **NEVER** alter business logic (joins, where clauses, field names) unless explicitly safe.
- **Syntax**: Do not invent Qlik syntax. If unsure, keep the original code.

### 3. Testing & Quality Assurance
- **Unit Tests**: Located in `server/test/`. Run with `npm test` (check `package.json` for specific scripts).
- **Fixtures**: Use `server/test/fixtures/` for testing agent responses (e.g., `malformed.json`, `valid_v1.json`).
- **Lint/Typecheck**: Always run `npm run lint` and `npm run typecheck` before committing.

## 🛠 Developer Workflow

- **Start All**: `npm run start:dev` (root) runs server and web concurrently.
- **Server Dev**: `cd server && npm run dev` (uses `ts-node-dev`).
- **Web Dev**: `cd web && npm run dev` (Vite).
- **Build**: `cd web && npm run build` (required for production serving).

## 📂 Key Files & Directories

- `server/src/agents/qlikOptimizeAgent.ts`: **CRITICAL**. Main agent logic and prompt.
- `server/src/lib/llmClient.ts`: LLM provider configuration and error handling.
- `server/src/validators/qlikValidator.ts`: Security and syntax validation rules.
- `server/src/routes/scripts.routes.ts`: Main API endpoint definition.
- `web/src/api/client.ts`: Frontend API client.

## 🚨 Common Pitfalls

- **Environment Variables**: `GEMINI_API_KEY` is required.
- **JSON Parsing**: The agent relies on `JSON.parse()`. Ensure prompts explicitly request **pure JSON** without Markdown code blocks.
- **Risk Assessment**: The `breakingRisk` calculation in `qlikOptimizeAgent.ts` is vital. Do not lower risk thresholds without thorough testing.
