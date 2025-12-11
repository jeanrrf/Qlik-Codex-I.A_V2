# 🔍 Debug: Autenticação Funcionando Apenas para OWNER

## 🐛 Problema Relatado

**Sintoma**: Apenas usuários com role OWNER conseguem autenticar. Usuários normais (role USER) não conseguem passar pela autenticação após login com Google.

**Logs Observados**:
```
✅ Revalidação concluída
✅ Auth processado - redirecionando
🔄 [AuthContext] Revalidate: Iniciando...
🌐 [AuthContext] Verificando status de autenticação...
✅ [AuthContext] Status recebido: {authenticated: false}  ← PROBLEMA AQUI
❌ [AuthContext] Usuário não autenticado
```

---

## 🔎 Investigação Realizada

### 1. Fluxo de Autenticação

```
1. Login Google → Backend recebe código
2. Backend cria sessão em auth_sessions
3. Backend retorna JWT accessToken
4. Frontend salva token no localStorage
5. Frontend chama /api/auth/status (com token)
6. Backend valida token → FALHA AQUI para usuários normais
```

### 2. Possíveis Causas

#### A) Sessão não está sendo criada no Turso
- Token JWT é criado mas não inserido em `auth_sessions`

#### B) Sessão existe mas está expirada imediatamente
- Data de expiração calculada incorretamente
- Timezone do Turso vs backend

#### C) Token não está sendo enviado corretamente
- Cookie não persiste
- localStorage não funciona em produção

#### D) Busca de sessão falha silenciosamente
- Query SQL com problema
- Comparação de token com issue

---

## ✅ Correções Aplicadas

### 1. **Logs Detalhados em `getSessionByToken`**

Agora a função reporta 3 cenários:

```typescript
// Caso 1: Sessão válida
logger.info("[AUTH] Sessão encontrada e válida", {
  sessionId, userId, expiresAt
});

// Caso 2: Sessão expirada
logger.warn("[AUTH] Sessão encontrada mas EXPIRADA", {
  sessionId, expiresAt, now
});

// Caso 3: Sessão não existe
logger.warn("[AUTH] Sessão NÃO EXISTE no banco", {
  tokenPrefix
});
```

### 2. **Logs Detalhados em `requireAuth` Middleware**

```typescript
// Valida JWT
logger.debug("[AUTH] Token JWT válido", { userId, sessionId });

// Busca sessão
logger.debug("[AUTH] Buscando sessão no banco...", { sessionId });

// Sessão não encontrada
logger.warn("[AUTH] Sessão não encontrada no banco", {
  userId, sessionId, tokenPrefix
});

// Sessão válida
logger.debug("[AUTH] Sessão válida encontrada", {
  sessionId, userId
});
```

---

## 🧪 Como Diagnosticar

### 1. **Testar em Produção com Logs**

Faça deploy e observe os logs no Render:

1. Acesse Render Dashboard → Service → Logs
2. Faça login com um usuário normal (não OWNER)
3. Procure por logs `[AUTH]`

### 2. **Cenários Esperados**

#### ✅ **Sucesso (funciona)**
```
[AUTH] Token JWT válido { userId: 'xxx', sessionId: 'yyy' }
[AUTH] Buscando sessão no banco... { sessionId: 'yyy' }
[AUTH] Sessão encontrada e válida { sessionId: 'yyy', userId: 'xxx' }
[AUTH] Sessão válida encontrada { sessionId: 'yyy', userId: 'xxx' }
```

#### ❌ **Sessão não existe**
```
[AUTH] Token JWT válido { userId: 'xxx', sessionId: 'yyy' }
[AUTH] Buscando sessão no banco... { sessionId: 'yyy' }
[AUTH] Sessão NÃO EXISTE no banco { tokenPrefix: 'eyJhbGciOiJIUzI...' }
```

**Causa**: A sessão nunca foi criada em `auth_sessions` no Turso.

**Solução**: Verificar se `createAuthSession` está sendo chamado no callback do Google.

#### ⏰ **Sessão expirada**
```
[AUTH] Token JWT válido { userId: 'xxx', sessionId: 'yyy' }
[AUTH] Buscando sessão no banco... { sessionId: 'yyy' }
[AUTH] Sessão encontrada mas EXPIRADA {
  sessionId: 'yyy',
  expiresAt: '2025-12-10T10:00:00.000Z',
  now: '2025-12-11T15:38:00.000Z'
}
```

**Causa**: Sessão expirou (pode ser timezone ou configuração de duração).

**Solução**: Verificar `effectiveAuthDurationDays` em config.ts.

#### 🔑 **Token JWT inválido**
```
[AUTH] Token JWT inválido ou expirado { error: 'jwt expired' }
```

**Causa**: JWT expirou ou assinatura inválida.

**Solução**: Verificar `JWT_SECRET` e `JWT_EXPIRES_IN` no backend.

---

## 🔧 Próximos Passos (Baseado nos Logs)

### Se "Sessão NÃO EXISTE no banco"

1. Verificar se `createAuthSession` é chamado em `auth.routes.ts`:

```typescript
// Em /api/auth/google/callback
const { session, tokens } = await createAuthSession(user, req.ip, req.get("user-agent"));
```

2. Verificar no Turso se a tabela `auth_sessions` existe:

```bash
turso db shell qlik-codex-production
```

```sql
-- Verificar estrutura
.schema auth_sessions

-- Verificar se há registros
SELECT COUNT(*) FROM auth_sessions;

-- Ver últimas sessões criadas
SELECT id, user_id, substr(token, 1, 20) as token_prefix, expires_at, created_at
FROM auth_sessions
ORDER BY created_at DESC
LIMIT 10;
```

3. Se a tabela não existe ou está vazia:
   - Executar migration (criar tabela)
   - Verificar se `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` estão corretos no Render

---

### Se "Sessão EXPIRADA"

1. Verificar configuração de duração em `server/.env`:

```env
JWT_EXPIRES_IN=7d  # ou 400d
```

2. Verificar `config.ts`:

```typescript
effectiveAuthDurationDays: Number.isFinite(parsed)
  ? Math.min(parsed, 400)
  : 400
```

3. Verificar timezone do Turso vs backend:

```sql
-- No Turso
SELECT datetime('now');  -- Deve ser UTC

-- No backend (logs)
new Date().toISOString()  -- Também UTC
```

---

### Se "Token JWT inválido"

1. Verificar se `JWT_SECRET` é o mesmo em todos os ambientes
2. Verificar se token não foi alterado no localStorage
3. Verificar se `JWT_EXPIRES_IN` não é muito curto

---

## 📊 Checklist de Validação

- [ ] Deploy feito no Render
- [ ] Logs aparecendo no Render Dashboard
- [ ] Login com usuário normal testado
- [ ] Logs `[AUTH]` identificados
- [ ] Cenário diagnosticado (sessão não existe, expirada, ou JWT inválido)
- [ ] Ação corretiva tomada baseada no diagnóstico

---

## 🚀 Deploy para Testar

```bash
git add server/src/services/authService.ts server/src/middleware/authMiddleware.ts
git commit -m "debug: adicionar logs detalhados para diagnosticar autenticação"
git push origin OFICIAL
```

Aguarde deploy no Render (~2 minutos) e teste com usuário normal.

---

## 📝 Observações

- **OWNER bypass funciona**: Porque usa `verifyOwnerToken()` que não depende de sessão no banco
- **Usuários normais precisam de sessão**: Validação completa com JWT + sessão no Turso
- **Logs são temporários**: Remover após identificar o problema para não poluir logs de produção

---

**Data**: 11 de Dezembro de 2025  
**Status**: 🔍 Diagnóstico em andamento - aguardando logs de produção
