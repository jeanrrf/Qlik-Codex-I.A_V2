# Guia de Deploy - Qlik Codex I.A (Zero Reais)

Este guia explica como publicar o projeto em produção usando serviços gratuitos: **Render** (Backend) e **Vercel** (Frontend).

## 1. Backend (Render)

O backend precisa de um servidor persistente para suportar SSE (Server-Sent Events) e SQLite. O Render oferece um plano gratuito ideal para isso.

### Passos:
1. Crie uma conta no [Render](https://render.com).
2. Conecte seu repositório GitHub/GitLab.
3. Crie um novo **Web Service**.
4. Selecione o repositório.
5. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free
6. Adicione as Variáveis de Ambiente (Environment Variables):
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `https://seu-app-frontend.vercel.app` (Você atualizará isso depois de criar o frontend)
   - `GEMINI_API_KEY`: Sua chave da Google AI Studio
   - `NVIDIA_API_KEY`: Sua chave da NVIDIA (se usar)
   - `JWT_SECRET`: Uma string aleatória segura
   - `FRONTEND_URL`: `https://seu-app-frontend.vercel.app`

O Render vai gerar uma URL para seu backend, ex: `https://qlik-codex-backend.onrender.com`.

## 2. Frontend (Vercel)

O frontend é um app React/Vite estático.

### Passos (Via CLI):
1. Instale a Vercel CLI: `npm i -g vercel`
2. Entre na pasta web: `cd web`
3. Execute o deploy:
   ```bash
   vercel
   ```
4. Siga as instruções na tela.
5. Quando perguntado sobre configurações, aceite os padrões (Vite).
6. Após o deploy, vá no painel da Vercel > Settings > Environment Variables.
7. Adicione a variável para conectar ao backend:
   - `VITE_API_URL`: `https://qlik-codex-backend.onrender.com` (A URL do seu backend no Render)
8. Redeploy o frontend (ou rode `vercel --prod`).

### Passos (Via Git Integration):
1. Vá no painel da Vercel e clique em "Add New Project".
2. Importe o repositório.
3. Configure:
   - **Root Directory**: `web`
   - **Framework Preset**: Vite
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL`: `https://qlik-codex-backend.onrender.com`
5. Clique em Deploy.

## 3. Finalização

1. Volte no painel do **Render** (Backend).
2. Atualize a variável `CORS_ORIGIN` e `FRONTEND_URL` com a URL final do seu frontend na Vercel (ex: `https://qlik-codex.vercel.app`).
3. O backend irá reiniciar automaticamente.

## Notas Importantes (Limitações Free Tier)

- **Banco de Dados**: O SQLite no Render Free Tier é **efêmero**. Se o servidor reiniciar (o que acontece após inatividade), os dados (histórico, usuários) serão resetados. Para persistência real, considere usar um banco externo como **Turso** ou **Neon** (ambos têm planos gratuitos) e alterar a configuração do backend.
- **Cold Start**: O Render Free Tier "dorme" após 15 min de inatividade. O primeiro request pode demorar ~50 segundos.
