# Guia de Migração para Vercel + Convex

Você escolheu a stack moderna: **Vercel** (Frontend) + **Convex** (Backend/Database).

## O que foi feito até agora:
1.  Instalamos o `convex` no projeto `web`.
2.  Criamos a estrutura `web/convex` com:
    -   `schema.ts`: Definição das tabelas (Users, Sessions, History).
    -   `sessions.ts`: Mutações para gerenciar estado.
    -   `actions.ts`: Ação (backend function) para rodar a otimização.

## Próximos Passos (Manual):

### 1. Inicializar Convex
No terminal, dentro da pasta `web`:
```bash
npx convex dev
```
Isso vai pedir para você fazer login e criar um projeto no Convex. Ele vai gerar a pasta `convex/_generated`.

### 2. Migrar a Lógica de IA
O arquivo `web/convex/actions.ts` atualmente é um esqueleto. Para que a IA funcione igual ao servidor antigo, você precisa:
1.  Copiar a lógica de `server/src/agents/qlikMegaOptimizer.ts` para dentro de `web/convex/`.
2.  Adaptar as chamadas de API (fetch) para rodar no ambiente do Convex (que é Node.js-like).
3.  Configurar as variáveis de ambiente (GEMINI_API_KEY, etc.) no painel do Convex (Settings > Environment Variables).

### 3. Conectar o Frontend
No arquivo `web/src/main.tsx`, envolva seu App com o `ConvexProvider`:

```tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
```

### 4. Deploy na Vercel
1.  Faça o push para o GitHub.
2.  Importe o projeto `web` na Vercel.
3.  Nas configurações de Build da Vercel, o comando de build deve ser `npx convex deploy && tsc && vite build`.
4.  Adicione as variáveis de ambiente (`VITE_CONVEX_URL`, etc.).

## Vantagens desta abordagem
-   **Realtime Nativo**: O frontend atualiza automaticamente quando o Convex muda os dados (sem precisar de SSE manual).
-   **Sem Servidor para Gerenciar**: Não precisa do Render nem do Firebase Functions.
-   **Escalabilidade**: Convex escala automaticamente.
