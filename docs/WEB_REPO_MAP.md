# 🗺️ WEB REPO MAP - QLIK CODEX I.A

> **Versão**: 2.0 (Clean Architecture)
> **Stack**: React 18, Vite, TypeScript, CSS Modules (Glassmorphism)
> **Status**: Production Ready

---

## 🏗️ ARQUITETURA GERAL

O frontend opera como uma **SPA (Single Page Application)** leve e reativa, servida pelo backend Express em produção ou via Vite em desenvolvimento.

### Principais Características
- **Roteamento Manual**: Gerenciado via `App.tsx` e `NavigationContext` (sem react-router pesado).
- **Comunicação Real-time**: SSE (Server-Sent Events) consumido via `useOptimizationProgress`.
- **Design System**: Glassmorphism nativo (CSS puro + variáveis) sem frameworks de UI pesados.
- **Autenticação**: JWT via `AuthContext` com persistência local.

---

## 📂 ESTRUTURA DE DIRETÓRIOS (`web/src`)

```text
src/
├── api/                    # Camada de comunicação HTTP
│   ├── authClient.ts       # Login, Register, Google Auth
│   ├── client.ts           # Instância Axios configurada
│   └── sessionClient.ts    # Gerenciamento de sessão
│
├── components/             # Componentes Reutilizáveis
│   ├── ConsultancyDocumentViewer.tsx  # 📄 Renderizador do relatório final (Markdown + Mermaid inline)
│   ├── QlikFormatterTool.tsx          # 🛠️ Ferramenta isolada de formatação
│   ├── ScriptAnalysisInfo.tsx         # 📊 Painel compacto de métricas
│   └── UserMenu.tsx                   # 👤 Menu de perfil/logout
│
├── contexts/               # Gestão de Estado Global
│   ├── AuthContext.tsx     # Usuário, Token, Login/Logout
│   └── NavigationContext.tsx # Navegação entre "views"
│
├── hooks/                  # Lógica de Negócio (Custom Hooks)
│   └── useOptimizationProgress.ts # 🧠 O CÉREBRO do frontend (SSE, Status, Steps)
│
├── lib/                    # Utilitários Puros
│   ├── apiClient.ts        # Helpers de API
│   └── qlikSyntaxHighlighter.ts # Syntax highlighting para Qlik Sense
│
├── pages/                  # Telas Principais
│   ├── LandingPage.tsx     # Home / Apresentação
│   ├── LoginPage.tsx       # Autenticação
│   ├── OptimizerPageV2.tsx # 🚀 Interface atual do otimizador (upload + progresso)
│   ├── ProfilePage.tsx     # Dados do usuário e histórico
│   └── AuthCallback.tsx    # Handler de retorno OAuth
│
├── types/                  # Definições TypeScript (Shared)
│   ├── api.ts              # Interfaces de resposta da API
│   ├── auth.ts             # Interfaces de usuário/auth
│   └── consultancy.ts      # Estrutura do documento gerado
│
├── App.tsx                 # Router e Layout Base
├── main.tsx                # Entry Point
└── styles.css              # Variáveis Globais e Reset
```

---

## 🔄 FLUXO DE DADOS (CORE FLOW)

### 1. Otimização de Script (The Main Loop)
1.  **User Action**: Upload de arquivo em `OptimizerPageV2`.
2.  **Trigger**: Chama `optimization.startOptimization()` (do hook `useOptimizationProgress`).
3.  **API Call**: POST `/api/optimize` inicia o processo no backend.
4.  **Feedback Loop**:
    *   O hook mantém estado de `stages` (Análise, Otimização, Documentação).
    *   Recebe eventos SSE (embora a V2 use polling/post-update, a estrutura está pronta para SSE).
    *   Atualiza UI em tempo real.
5.  **Result**: Ao finalizar, exibe `ConsultancyDocumentViewer` com o relatório.

### 2. Autenticação
1.  **Login**: `LoginPage` -> `authClient.login()`.
2.  **Token**: Armazenado em `localStorage` e memória via `AuthContext`.
3.  **Proteção**: `App.tsx` verifica `isAuthenticated`. Se falso, renderiza `LoginPage`.

---

## 🧩 COMPONENTES CHAVE

### `OptimizerPageV2.tsx`
Tela principal que está em produção hoje.
- **Responsabilidade**: Upload, configuração rápida, exibição de progresso em estágios e acesso ao relatório.
- **Estado**: Orquestra ganchos (`useOptimizationProgress`, `useSessionPersistence`) e aplica estilos Controle/Pipeline.

### `ConsultancyDocumentViewer.tsx`
O visualizador rico do resultado.
- **Features**:
    - Renderiza Markdown (ReactMarkdown).
    - Renderiza diagramas Mermaid direto via mermaid.js.
    - Syntax Highlighting para blocos de código Qlik.
    - Botões de Download/Copy.

### `useOptimizationProgress.ts`
O hook mais complexo e importante.
- **Gerencia**:
    - Lista de etapas (`ANALYSIS_STAGES`, `OPTIMIZATION_STAGES`).
    - Tempo decorrido.
    - Erros e retentativas.
    - Estado final (`ConsultancyDocument`).

---

## 🎨 ESTILIZAÇÃO & DESIGN SYSTEM

O projeto não usa Tailwind ou Bootstrap. Usa **CSS Modules** e **CSS Variables** nativas.

- **Tema**: Dark Mode Glassmorphism.
- **Cores Principais**:
    - Cyan: `#00f2ff` (Ações, Destaques)
    - Purple: `#bd00ff` (IA, Magic)
    - Background: `#050508` (Deep Space)
- **Arquivos CSS**:
    - `styles.css`: Globais.
    - `*.css`: Co-locados com componentes (ex: `LoginPage.css`).

---

## 🛠️ MANUTENÇÃO & EXTENSÃO

### Adicionar Nova Página
1.  Crie `pages/NovaPagina.tsx`.
2.  Adicione a opção no tipo `View` em `App.tsx`.
3.  Adicione a condicional no render do `App.tsx`.

### Adicionar Novo Evento de Progresso
1.  Atualize `types/api.ts` com o novo tipo de evento.
2.  Atualize `useOptimizationProgress.ts` para escutar e processar o evento.
3.  Atualize a UI em `OptimizerPageV2` se necessário.
