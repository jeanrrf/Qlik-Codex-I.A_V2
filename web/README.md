# Qlik Codex I.A - Frontend

Interface web moderna para o otimizador de scripts Qlik.

## Tecnologias
- **React 18** com TypeScript
- **Vite** para build e dev server
- **CSS Modules / Vanilla CSS** para estilização (tema escuro, glassmorphism)

## Estrutura
- `src/pages`: Páginas principais (Landing, OptimizerV2)
- `src/components`: Componentes reutilizáveis (ConsultancyDocumentViewer, ScriptAnalysisInfo, etc.)
- `src/hooks`: Hooks customizados (useSessionPersistence, useOptimizationProgress)
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

### Visual diff alinhado (novo)
- A visualização de "Comparação de Código" no documento de consultoria agora mostra um diff alinhado por linha (estilo git diff) — linhas adicionadas, removidas e modificadas aparecem lado a lado, sincronizadas por número de linha para facilitar a revisão humana.
  - Além disso o diff agora tenta detectar mudanças intra-linha (marcando trechos removidos/ inseridos) para facilitar revisão fina.
  - Também é possível exportar o diff como arquivo (.diff) para revisão externa/integração com processos git.
  

## Como Rodar (modo dev)

Recomendado: inicie o servidor e o frontend juntos a partir da raiz do repositório:

```powershell
npm install
npm run start:dev
```

Isso executa o backend (porta 3000) e o frontend (porta 5173) em paralelo.

Se preferir rodar apenas o frontend (por exemplo, para trabalhar em UI isoladamente), execute na pasta `web`:

```powershell
cd web
npm install
npm run dev
```

Observação útil: o frontend usa proxy para encaminhar requisições `/api` para `http://localhost:3000` durante o desenvolvimento. Se o backend não estiver rodando, o Vite mostrava muitos erros ECONNREFUSED.

Com a atualização no `vite.config.ts` agora o proxy detecta quando o backend não está disponível e retorna um 502 JSON claro com instruções (sem inundar o terminal com stack traces). Mas para a aplicação funcionar, inicie o backend quando estiver desenvolvendo funcionalidades que dependem da API.

## Verificações de Acessibilidade (pequenas automações)

Para evitar regressões relacionadas à acessibilidade automática do navegador (Lighthouse / DevTools: "A form field element should have an id or name attribute"), adicionamos uma verificação simples no repositório.

Na pasta `web/tools` há um script `check-form-ids.js` que valida se elementos `<input>`, `<textarea>` e `<select>` no `web/src` possuem `id` ou `name`. Rode localmente com:

```powershell
npm run check:form-ids
```

O objetivo é detectar inadvertidamente inputs sem `id`/`name` durante o desenvolvimento e garantir melhor compatibilidade com recursos de autofill e auditorias de acessibilidade.

CI: Há um workflow no repositório que executa `npm run check:form-ids` e `npm run lint` dentro da pasta `web` em pushes/PRs para `main`/`main_ofc`. Isso ajuda a prevenir regressões automaticamente.
