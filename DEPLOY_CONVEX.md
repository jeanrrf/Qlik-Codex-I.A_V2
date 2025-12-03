# Deploy Completo: Vercel + Convex (Zero Reais)

A migração para Convex foi completada! Agora você tem uma arquitetura 100% serverless.

## Arquitetura Final

```
┌─────────────────┐      ┌─────────────────┐
│   Vercel        │      │   Convex        │
│   (Frontend)    │ ───► │   (Backend)     │
│   React + Vite  │      │   + Database    │
└─────────────────┘      │   + Gemini API  │
                         └─────────────────┘
```

## O que foi feito:

1. ✅ **Convex inicializado** - Projeto configurado localmente
2. ✅ **Schema criado** - Tabelas: `users`, `sessions`, `history`
3. ✅ **Actions migradas** - Lógica do `qlikMegaOptimizer.ts` portada para `convex/optimizer.ts`
4. ✅ **ConvexProvider** - Frontend conectado ao Convex
5. ✅ **Hook reativo** - `useConvexOptimization.ts` para atualizações em tempo real

## Próximos Passos (Para Publicar):

### 1. Criar conta e vincular projeto
```bash
cd web
npx convex login
npx convex deploy
```

### 2. Configurar Variáveis de Ambiente no Convex Dashboard
Após o deploy, vá em **Settings > Environment Variables** no painel do Convex e adicione:
- `GEMINI_API_KEY` = sua chave do Google AI Studio

### 3. Deploy na Vercel
1. Faça push do código para o GitHub
2. Importe o projeto `web` na Vercel
3. Configure as variáveis de ambiente:
   - `VITE_CONVEX_URL` = (URL do seu deployment Convex - ex: `https://your-project.convex.cloud`)
   - `VITE_USE_CONVEX` = `true`

### 4. Pronto!
O frontend na Vercel vai se conectar automaticamente ao backend no Convex.

## Comandos Úteis

```bash
# Rodar localmente (dev)
cd web
npx convex dev  # Inicia backend Convex local
npm run dev     # Inicia frontend Vite

# Deploy para produção
npx convex deploy
vercel --prod
```

## Vantagens desta Stack

- **Realtime nativo**: Dados atualizam automaticamente no frontend (sem polling/SSE manual)
- **Escalabilidade**: Convex escala automaticamente
- **Zero servidor**: Não precisa gerenciar Express, Render, etc.
- **Custo zero**: Ambos têm planos gratuitos generosos
- **Type-safe**: TypeScript end-to-end
