# Deploy Checklist - Qlik Codex I.A

## ✅ Pré-Deploy

### Backend (Render)

- [ ] **Variáveis de Ambiente Configuradas**:
  - [ ] `TURSO_DATABASE_URL`
  - [ ] `TURSO_AUTH_TOKEN`
  - [ ] `FRONTEND_URL` (URL da Vercel)
  - [ ] `CORS_ORIGIN` (URL da Vercel)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI` (URL do Render + `/api/auth/google/callback`)
  - [ ] `JWT_SECRET` (string aleatória forte)
  - [ ] `AUTH_COOKIE_SAMESITE=none`
  - [ ] `GEMINI_API_KEY`
  - [ ] `NVIDIA_API_KEY`

### Frontend (Vercel)

- [ ] **Variáveis de Ambiente Configuradas**:
  - [ ] `VITE_API_BASE_URL` (URL do Render)
  - [ ] `VITE_OWNER_EMAIL`

### Google OAuth

- [ ] **Console do Google Cloud configurado**:
  - [ ] Authorized JavaScript origins incluem URL da Vercel e Render
  - [ ] Authorized redirect URIs incluem `{RENDER_URL}/api/auth/google/callback`

---

## 🚀 Deploy

### 1. Backend (Render)

```bash
# Push para branch principal ou manual deploy no Render Dashboard
git push origin main
```

**Aguardar**:
- Build completar sem erros
- Serviço estar "Live"
- Logs não mostrarem erros críticos

### 2. Frontend (Vercel)

```bash
# Push para branch principal
git push origin main
```

**Aguardar**:
- Build completar
- Preview URL estar disponível
- Produção atualizada

---

## 🧪 Testes Pós-Deploy

### 1. Health Check do Backend

```bash
curl https://seu-backend.onrender.com/api/health
```

**Esperado**:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": {
    "tursoConfigured": true
  }
}
```

### 2. CORS Funcional

No DevTools do navegador (Console):

```javascript
fetch('https://seu-backend.onrender.com/api/health', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log);
```

**Esperado**: Resposta JSON sem erro de CORS

### 3. Login com Google

1. Acesse `https://seu-frontend.vercel.app`
2. Clique em **"Entrar com Google"**
3. Selecione conta Google
4. **CRÍTICO**: Deve redirecionar para `/auth/callback` e depois para `/`
5. Usuário deve estar logado (ver nome/avatar no topo)

### 4. Persistência de Sessão

1. Após login, recarregue a página (F5)
2. Usuário deve continuar logado
3. Cookie `auth_token` deve estar presente (DevTools → Application → Cookies)

### 5. Funcionalidade de Otimização

1. Cole um script Qlik
2. Clique em "Otimizar"
3. Aguarde resposta da IA
4. Verifique se resultado é exibido

---

## 🐛 Troubleshooting Comum

### Problema: "Failed to fetch" ao tentar login

**Causa**: CORS não configurado corretamente

**Solução**:
1. Verificar `CORS_ORIGIN` no Render
2. Formato correto: `https://seu-app.vercel.app` (sem `/` no final)
3. Reiniciar serviço no Render

---

### Problema: Redirecionamento após login não funciona

**Causa**: Variável `FRONTEND_URL` incorreta

**Solução**:
1. Verificar `FRONTEND_URL` no Render
2. Deve ser exatamente a URL da Vercel (ex: `https://seu-app.vercel.app`)
3. Reiniciar serviço no Render

---

### Problema: "TURSO_DATABASE_URL must be set"

**Causa**: Variáveis do Turso não configuradas

**Solução**:
```bash
# Obter URL do banco
turso db show qlik-codex-production

# Gerar novo token
turso db tokens create qlik-codex-production
```

Adicionar no Render e reiniciar serviço.

---

### Problema: Cookie não persiste entre reloads

**Causa**: `AUTH_COOKIE_SAMESITE` não configurado para cross-domain

**Solução**:
1. Adicionar `AUTH_COOKIE_SAMESITE=none` no Render
2. Confirmar que conexão é HTTPS (obrigatório para SameSite=none)
3. Reiniciar serviço

---

### Problema: Google OAuth retorna erro

**Causa**: Redirect URI não autorizada

**Solução**:
1. Acessar https://console.cloud.google.com/
2. Navegar até Credentials → OAuth 2.0 Client IDs
3. Adicionar `https://seu-backend.onrender.com/api/auth/google/callback`
4. Aguardar alguns segundos para propagar

---

## 📊 Monitoramento

### Logs do Render

```bash
# Dashboard Render → Logs
# Filtrar por "ERROR" ou "WARN"
```

### Logs da Vercel

```bash
vercel logs --follow
```

### Analytics

```bash
curl https://seu-backend.onrender.com/api/analytics/summary
```

---

## 🔄 Rollback

### Render

1. Dashboard → Service → "Rollback"
2. Selecionar deploy anterior
3. Confirmar

### Vercel

1. Dashboard → Deployments
2. Encontrar deploy estável
3. Clicar em "..." → "Promote to Production"

---

## 📝 Notas Importantes

- **Turso**: Único banco de dados suportado. PostgreSQL, MySQL, MongoDB **NÃO** são suportados.
- **Cookies**: Em produção, `SameSite=none` é **obrigatório** para autenticação cross-domain.
- **HTTPS**: Render e Vercel fornecem SSL automaticamente.
- **Tempo de Build**: 
  - Render (backend): ~2-3 minutos
  - Vercel (frontend): ~1-2 minutos

---

**Última atualização**: Dezembro 2025
