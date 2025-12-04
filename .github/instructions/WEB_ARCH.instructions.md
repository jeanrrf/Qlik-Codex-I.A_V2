---
applyTo: 'web/**'
---
# WEB ARCHITECTURE & RULES - QLIK CODEX I.A

## 🗺️ MAPA DO REPOSITÓRIO (WEB)

### Estrutura Core (`web/src`)
*   **`App.tsx`**: Router manual e Layout base. Gerencia a troca de views (`landing` | `optimizer` | `profile`).
*   **`main.tsx`**: Entry point Vite.
*   **`hooks/useOptimizationProgress.ts`**: **CRÍTICO**. Gerencia todo o estado da otimização, SSE, etapas e erros. É o "cérebro" do frontend.
*   **`pages/OptimizerPageV2.tsx`**: A interface principal de otimização em produção.
*   **`components/ConsultancyDocumentViewer.tsx`**: Renderiza o relatório final (Markdown + Mermaid).

### Camadas
1.  **Pages**: Telas completas (`pages/`).
2.  **Components**: Blocos reutilizáveis (`components/`).
3.  **Contexts**: Estado global (`AuthContext`, `NavigationContext`).
4.  **API**: Camada de serviço (`api/`, `lib/apiClient.ts`).

---

## 📐 REGRAS DE ARQUITETURA (FRONTEND)

### 1. Roteamento e Navegação
*   **NÃO USE React Router**. O projeto usa um roteamento baseado em estado simples em `App.tsx`.
*   Para navegar, use o `NavigationContext` (`useNavigation`).
*   Novas páginas devem ser adicionadas ao tipo `View` em `App.tsx`.

### 2. Estilização (Glassmorphism)
*   **NÃO USE Tailwind ou Bootstrap**.
*   Use CSS puro com variáveis CSS (definidas em `styles.css`).
*   **Padrão**: Arquivo `.tsx` deve ter seu `.css` co-locado (ex: `UserMenu.tsx` + `UserMenu.css`).
*   **Tema**: Dark mode nativo. Use `rgba(..., 0.x)` para transparências e `backdrop-filter: blur()`.

### 3. Gerenciamento de Estado
*   **Global**: Use `Context` apenas para dados que afetam a app toda (Auth, Nav).
*   **Local**: Prefira `useState` e `useReducer` dentro das páginas.
*   **Complexo**: Para a lógica de otimização, centralize tudo em `useOptimizationProgress.ts`. Não espalhe lógica de SSE pelos componentes.

### 4. Componentes
*   Mantenha componentes pequenos e focados.
*   Se um componente crescer demais (como `OptimizerPageV2`), extraia sub-componentes para `components/`.
*   **Ícones**: Use SVGs inline dentro do componente ou um objeto `Icons` local. Não instale bibliotecas de ícones pesadas.

### 5. Integração com Backend
*   Use `api/client.ts` (Axios) para chamadas HTTP.
*   Trate erros no nível do serviço ou no hook, nunca direto no componente de UI.
*   Tipos de resposta devem estar em `types/api.ts`.

---

## 🚫 ANTI-PATTERNS (O QUE NÃO FAZER)
*   Criar arquivos soltos na raiz de `src/`.
*   Misturar lógica de negócio (cálculos, parsers) dentro do JSX. Mova para `lib/` ou hooks.
*   Usar `any` em TypeScript. Defina interfaces em `types/`.
*   Importar arquivos de `server/` no `web/`. O código deve ser isolado.

---

## 🧪 CHECKLIST DE QUALIDADE
1.  O componente tem seu próprio CSS ou usa classes globais existentes?
2.  A lógica complexa foi extraída para um hook?
3.  Os tipos estão definidos em `types/`?
4.  O build (`npm run build`) passa sem erros?
