# Configuração de Produção - Qlik Codex I.A

## Infraestrutura Obrigatória

O Qlik Codex I.A utiliza **exclusivamente** as seguintes plataformas em produção:

### 1. **Turso** - Banco de Dados
- **O que é**: SQLite cloud (edge database)
- **Onde criar**: https://turso.tech/
- **Variáveis necessárias**:
  - `TURSO_DATABASE_URL`: URL do banco (ex: `libsql://seu-db.turso.io`)
  - `TURSO_AUTH_TOKEN`: Token de autenticação

### 2. **Render** - Backend (API)
- **O que é**: Plataforma de deploy para o servidor Express
- **Onde criar**: https://render.com/
- **Arquivo de configuração**: `render.yaml` (já configurado)

### 3. **Vercel** - Frontend (SPA React)
- **O que é**: Plataforma de deploy para aplicações frontend
- **Onde criar**: https://vercel.com/
- **Arquivo de configuração**: `vercel.json` (já configurado)

---

## Configuração Passo a Passo

### 1. Criar Banco Turso

```bash
# Instalar CLI do Turso
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Criar banco
turso db create qlik-codex-production

# Obter URL do banco
turso db show qlik-codex-production

# Gerar token de autenticação
turso db tokens create qlik-codex-production
```

Copie:
- `TURSO_DATABASE_URL`: mostrada no comando `show`
- `TURSO_AUTH_TOKEN`: gerada no comando `tokens create`

### 2. Deploy no Render (Backend)

1. Faça login em https://render.com/
2. Crie um novo **Web Service**
3. Conecte ao repositório GitHub
4. Configure as **Environment Variables** (todas as listadas abaixo)
5. Render detectará automaticamente `render.yaml`

#### Variáveis de Ambiente Obrigatórias no Render:

```env
# Node
NODE_ENV=production

# URLs
CORS_ORIGIN=https://seu-frontend.vercel.app
FRONTEND_URL=https://seu-frontend.vercel.app

# Turso Database (OBRIGATÓRIO)
TURSO_DATABASE_URL=libsql://seu-db.turso.io
TURSO_AUTH_TOKEN=seu_token_aqui

# Google OAuth (obter em https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_secret_aqui
GOOGLE_REDIRECT_URI=https://seu-backend.onrender.com/api/auth/google/callback

# JWT
JWT_SECRET=um_segredo_forte_e_aleatorio_aqui
JWT_EXPIRES_IN=7d

# Auth Cookies (importante para cross-domain)
AUTH_COOKIE_SAMESITE=none
AUTH_COOKIE_DOMAIN=.onrender.com

# Owner Access
OWNER_ACCESS_TOKEN=token_secreto_do_proprietario
OWNER_EMAIL=sentinnellia@gmail.com

# LLM APIs
GEMINI_API_KEY=sua_chave_gemini
NVIDIA_API_KEY=sua_chave_nvidia
NVIDIA_MODEL_NAME=mistralai/mistral-large-3-675b-instruct-2512

# Outros
SERVE_STATIC_FRONTEND=false
```

### 3. Deploy na Vercel (Frontend)

1. Faça login em https://vercel.com/
2. Importe o repositório do GitHub
3. Configure:
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Adicione as **Environment Variables**:

```env
VITE_API_BASE_URL=https://seu-backend.onrender.com
VITE_OWNER_EMAIL=sentinnellia@gmail.com
```

5. Deploy automático ao push no branch `main`

### 4. Configurar Google OAuth

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou use existente
3. Habilite **Google+ API**
4. Crie credenciais OAuth 2.0:
   - **Authorized JavaScript origins**: 
     - `https://seu-frontend.vercel.app`
     - `https://seu-backend.onrender.com`
   - **Authorized redirect URIs**:
     - `https://seu-backend.onrender.com/api/auth/google/callback`
5. Copie `Client ID` e `Client Secret` para as variáveis do Render

---

## Verificação Pós-Deploy

### 1. Testar Health Check do Backend

```bash
curl https://seu-backend.onrender.com/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": {
    "tursoConfigured": true
  }
}
```

### 2. Testar Frontend

1. Acesse `https://seu-frontend.vercel.app`
2. Clique em **"Entrar com Google"**
3. Após login, deve redirecionar para `/auth/callback` e então para `/` (página principal)

### 3. Testar Integração Frontend → Backend

```bash
# No DevTools do navegador (Console)
fetch('https://seu-backend.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Solução de Problemas

### Login com Google não redireciona

**Problema**: Após login, página fica em branco ou não navega.

**Solução**:
1. Verifique se `FRONTEND_URL` está correto no Render
2. Verifique se `CORS_ORIGIN` inclui o domínio da Vercel
3. Confirme que `AUTH_COOKIE_SAMESITE=none` está configurado
4. Verifique se o redirect URI do Google OAuth está correto

### Erro "TURSO_DATABASE_URL must be set"

**Problema**: Backend não inicia no Render.

**Solução**:
1. Confirme que as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estão definidas no Render
2. Execute `turso db show qlik-codex-production` para verificar a URL
3. Regenere o token se necessário: `turso db tokens create qlik-codex-production`

### CORS Error

**Problema**: Frontend não consegue fazer requisições ao backend.

**Solução**:
1. Adicione o domínio Vercel em `CORS_ORIGIN` no Render
2. Formato: `https://seu-app.vercel.app` (sem barra no final)
3. Reinicie o serviço no Render após alterar

---

## Comandos Úteis

### Verificar logs do Render
```bash
# Acesse o dashboard do Render e clique em "Logs"
```

### Verificar logs da Vercel
```bash
# CLI da Vercel
vercel logs seu-deployment-url
```

### Executar migração no Turso
```bash
turso db shell qlik-codex-production < schema.sql
```

---

## Checklist de Produção

- [ ] Turso configurado e acessível
- [ ] Variáveis de ambiente configuradas no Render
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Google OAuth configurado com URIs corretos
- [ ] Health check do backend retornando `200 OK`
- [ ] Frontend carregando corretamente
- [ ] Login com Google funcionando
- [ ] Redirecionamento pós-login funcionando
- [ ] CORS configurado corretamente
- [ ] Cookies de autenticação funcionando (SameSite=none)

---

## Arquitetura de Produção

```
┌─────────────────┐
│   Usuário       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel (SPA)   │ ← Frontend React
│  /web/dist      │
└────────┬────────┘
         │ API calls
         ▼
┌─────────────────┐
│  Render (API)   │ ← Backend Express
│  /server/dist   │
└────────┬────────┘
         │ Database
         ▼
┌─────────────────┐
│  Turso (DB)     │ ← SQLite Cloud
│  libsql://...   │
└─────────────────┘
```

---

**Última atualização**: Dezembro 2025
