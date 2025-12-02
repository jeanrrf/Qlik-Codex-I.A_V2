# 🔐 Sistema de Autenticação e Autorização - Qlik Codex I.A

## Visão Geral

Sistema completo de autenticação Google OAuth 2.0 com controle de acesso baseado em roles (RBAC) para gerenciar permissões de uso da plataforma.

## Arquitetura Implementada

### 1. **Fluxo de Autenticação**

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Frontend   │──────>│   Backend    │──────>│   Google    │
│  (React)    │<──────│  (Express)   │<──────│   OAuth     │
└─────────────┘       └──────────────┘       └─────────────┘
       │                      │
       │                      ▼
       │              ┌──────────────┐
       └─────────────>│   SQLite DB  │
                      │  (sessions)  │
                      └──────────────┘
```

### 2. **Roles e Permissões**

#### **OWNER (Proprietário)**
- ✅ Acesso total e irrestrito
- ✅ Bypass de rate limiting
- ✅ Todos os modos (analysis, ultra-expert)
- ✅ Sem limites de scripts/dia
- ✅ Scripts ilimitados em tamanho

#### **USER (Outros/Terceiros)**
- ⚠️ Acesso limitado
- ⚠️ 10 otimizações/dia
- ⚠️ Scripts até 1MB
- ⚠️ Até 2 sessões simultâneas
- ⚠️ Apenas modo "analysis" (sem modificação de código)

## Componentes Criados

### Backend

#### **Types & Interfaces**
- `server/src/types/auth.ts` - Definições de User, Roles, Permissions, Limits

#### **Services**
- `server/src/services/authService.ts` - Lógica de autenticação
  - Google OAuth exchange
  - JWT generation/verification
  - Session management
  - Owner token bypass
  - User CRUD operations

#### **Middleware**
- `server/src/middleware/authMiddleware.ts` - Proteção de rotas
  - `requireAuth()` - Autenticação obrigatória
  - `optionalAuth()` - Autenticação opcional
  - `requireRole(...)` - Exige role específica
  - `requirePermission(...)` - Verifica permissões granulares
  - `checkUsageLimits()` - Valida limites de uso
  - `requireOwnership()` - Acesso apenas a recursos próprios

#### **Routes**
- `server/src/routes/auth.routes.ts` - Endpoints de autenticação
  - `GET /api/auth/google` - Inicia OAuth flow
  - `GET /api/auth/google/callback` - Callback OAuth
  - `POST /api/auth/token` - Login com owner token
  - `GET /api/auth/me` - Dados do usuário autenticado
  - `POST /api/auth/logout` - Encerra sessão
  - `POST /api/auth/logout-all` - Encerra todas as sessões
  - `GET /api/auth/status` - Verifica autenticação

#### **Database**
- Tabelas criadas em `server/src/lib/sqliteDb.ts`:
  - `users` - Dados dos usuários
  - `auth_sessions` - Sessões de autenticação com tokens

### Frontend

#### **Contexts**
- `web/src/contexts/AuthContext.tsx` - Estado global de autenticação
  - Gerencia user, isAuthenticated, isLoading
  - Funções: login(), loginWithGoogle(), logout(), refreshUser()

#### **API Clients**
- `web/src/api/authClient.ts` - Chamadas para API de auth
  - `getGoogleAuthUrl()` - Obter URL de OAuth
  - `getCurrentUser()` - Buscar dados do usuário
  - `loginWithToken()` - Login com owner token
  - `logout()` - Fazer logout

#### **Components**
- `web/src/pages/LoginPage.tsx` - Página de login
  - Botão Google OAuth
  - Input para owner token (bypass)
  - Tratamento de erros
  
- `web/src/components/UserMenu.tsx` - Menu do usuário autenticado
  - Avatar/nome/email
  - Badge de role com cores
  - Opções de perfil/configurações
  - Botão de logout

#### **App Integration**
- `web/src/App.tsx` - Integração com AuthProvider
  - Verifica autenticação ao carregar
  - Redireciona para login se não autenticado
  - Mostra loading durante verificação

## Configuração Necessária

### 1. Variáveis de Ambiente (`.env`)

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# JWT
JWT_SECRET=qlik-codex-ia-secret-change-in-production
JWT_EXPIRES_IN=15d

# Owner Access (bypass OAuth)
OWNER_ACCESS_TOKEN=your_secure_owner_token_here
OWNER_EMAIL=owner@qlikcodex.local

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 2. Google Cloud Console Setup

#### Criar Credenciais OAuth 2.0:

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie um projeto ou selecione existente
3. Clique em "Criar Credenciais" → "ID do Cliente OAuth 2.0"
4. Tipo de aplicativo: "Aplicativo da Web"
5. Configure URIs autorizados:
   - **Origem JavaScript autorizada**: `http://localhost:5173` (dev) e `https://seu-dominio.com` (prod)
   - **URIs de redirecionamento autorizados**: `http://localhost:3000/api/auth/google/callback`
6. Copie **Client ID** e **Client Secret** para `.env`

#### Ativar APIs necessárias:
- Google+ API
- Google People API

### 3. Gerar Owner Token

Execute no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Cole o resultado em `OWNER_ACCESS_TOKEN` no `.env`.

## Rotas Protegidas

### Antes (público):
```typescript
router.post("/optimize", apiLimiter, asyncHandler(async (req, res) => {
  // Qualquer um pode otimizar
}));
```

### Depois (protegido):
```typescript
router.post("/optimize", 
  requireAuth,           // Exige autenticação
  checkUsageLimits,      // Verifica limites de uso
  apiLimiter,
  asyncHandler(async (req: AuthRequest, res) => {
    // Apenas usuários autenticados com userId
  })
);
```

## Fluxo de Login

### Google OAuth:
1. Usuário clica em "Entrar com Google"
2. Redireciona para página de consentimento do Google
3. Google retorna código de autorização
4. Backend troca código por perfil do usuário
5. Cria/atualiza usuário no banco
6. Gera JWT token e define cookie httpOnly
7. Redireciona para frontend com sucesso

### Owner Token:
1. Proprietário cola token de acesso
2. Backend verifica contra `OWNER_ACCESS_TOKEN`
3. Busca/cria usuário owner no banco
4. Gera JWT e define cookie
5. Login imediato sem OAuth

## Segurança Implementada

- ✅ **JWT tokens** com expiração (15 dias)
- ✅ **httpOnly cookies** (não acessíveis via JavaScript)
- ✅ **CORS configurado** com credentials
- ✅ **Rate limiting** por IP
- ✅ **Session tracking** com last_activity
- ✅ **Automatic session cleanup** (expiradas)
- ✅ **Owner bypass** via token seguro (não hardcoded)
- ✅ **Role-based permissions** granulares

## Limites de Uso Configurados

```typescript
RoleUsageLimits = {
  OWNER: {
    optimizationsPerDay: -1,    // Ilimitado
    maxScriptSizeKB: -1,
    maxConcurrentSessions: -1,
    enabledModes: ["analysis", "ultra-expert"]
  },
  USER: {
    optimizationsPerDay: 10,
    maxScriptSizeKB: 1000,
    maxConcurrentSessions: 2,
    enabledModes: ["analysis"]   // SEM modificação de código
  }
}
```

## Próximos Passos (Recomendados)

1. **Implementar verificação de `optimizationsPerDay`**:
   - Adicionar contagem no banco de dados
   - Query para contar otimizações nas últimas 24h
   - Bloquear se limite atingido

2. **Dashboard de administração**:
   - Listar todos os usuários
   - Alterar roles manualmente
   - Ver histórico de otimizações por usuário
   - Desativar usuários

3. **Email notifications**:
   - Enviar email de boas-vindas
   - Notificar quando limite diário atingido
   - Alertas de segurança (múltiplos logins)

4. **Refresh token rotation**:
   - Implementar renovação automática de tokens
   - Invalidar refresh tokens usados

5. **Audit logging**:
   - Registrar todas as ações críticas
   - Exportar logs para análise

## Testando a Implementação

### 1. Testar Google OAuth:
```bash
# Iniciar servidor
cd server && npm run dev

# Iniciar frontend
cd web && npm run dev

# Acessar: http://localhost:5173
# Clicar em "Entrar com Google"
```

### 2. Testar Owner Token:
```bash
# Gerar token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Colar em .env como OWNER_ACCESS_TOKEN
# Na tela de login, clicar em "Acesso Proprietário"
# Colar o mesmo token
```

### 3. Testar API diretamente:
```bash
# Status de autenticação
curl http://localhost:3000/api/auth/status -b cookies.txt

# Dados do usuário
curl http://localhost:3000/api/auth/me -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## Gerenciamento de Usuários

### Como Definir Roles

Por padrão, todos os usuários que fazem login via **Google OAuth são criados como USER** (acesso limitado).

Para **promover você mesmo como OWNER**, existem 3 opções:

#### **Opção 1: Login com Owner Token (Recomendado)**
Use o token de proprietário definido em `.env`:

```bash
# 1. Gerar token seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Adicionar ao .env
OWNER_ACCESS_TOKEN=seu_token_aqui
OWNER_EMAIL=seu-email@dominio.com

# 3. Na tela de login, clicar em "Acesso Proprietário" e colar o token
```

Quando você faz login com o owner token, o sistema:
- Cria automaticamente um usuário com role **OWNER**
- Usa o email definido em `OWNER_EMAIL`

#### **Opção 2: Alterar Role Manualmente no Banco**

Se você já fez login via Google OAuth e quer se tornar OWNER:

```bash
# 1. Abrir banco de dados
sqlite3 server/data/qlik-codex.db

# 2. Ver usuários existentes
SELECT id, email, role FROM users;

# 3. Promover seu email para OWNER
UPDATE users SET role = 'owner' WHERE email = 'seu-email@gmail.com';

# 4. Verificar mudança
SELECT id, email, role FROM users;

# 5. Sair do SQLite
.exit
```

Depois disso, faça logout e login novamente para aplicar a mudança.

#### **Opção 3: Definir Email Owner no .env**

Configure seu email no `.env` **antes** do primeiro login:

```env
OWNER_EMAIL=seu-email@gmail.com
```

Então, edite `authService.ts` para verificar email na criação do usuário (veja seção abaixo).

### Automatizar Detecção de Owner por Email

Para que o sistema **automaticamente crie usuários com role OWNER** baseado em email:

Edite `server/src/services/authService.ts`, função `createOrUpdateUserFromGoogle`:

```typescript
// Criar novo usuário
const userId = uuidv4();

// Verificar se é email do owner
const role = profile.email === config.ownerEmail 
  ? UserRole.OWNER 
  : UserRole.USER;

db.prepare(`
  INSERT INTO users (id, email, name, role, google_id, avatar_url, created_at, last_login, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
`).run(userId, profile.email, profile.name, role, profile.id, profile.picture || null, now, now);
```

Com isso, quando alguém com o email definido em `OWNER_EMAIL` fizer login via Google, será automaticamente criado como OWNER.

```bash
# Ver sessões ativas no banco
sqlite3 server/data/qlik-codex.db "SELECT * FROM auth_sessions;"

# Ver usuários cadastrados
sqlite3 server/data/qlik-codex.db "SELECT id, email, role FROM users;"

# Limpar sessões expiradas manualmente
curl -X POST http://localhost:3000/api/auth/cleanup

# Verificar cookies no navegador (DevTools → Application → Cookies)
```

## Troubleshooting

### Erro: "Google OAuth credentials not configured"
- ✅ Verificar se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão no `.env`
- ✅ Reiniciar servidor após adicionar variáveis

### Erro: "Invalid token"
- ✅ Verificar se `JWT_SECRET` está configurado
- ✅ Token pode ter expirado (15 dias)
- ✅ Limpar cookies e fazer login novamente

### Erro: "Session expired"
- ✅ Sessão expirou após 15 dias de inatividade
- ✅ Fazer login novamente

### Google OAuth redireciona mas não loga:
- ✅ Verificar `GOOGLE_REDIRECT_URI` bate com Google Console
- ✅ Verificar `FRONTEND_URL` está correto
- ✅ Ver logs do servidor para detalhes do erro

---

**Sistema implementado com sucesso!** 🎉

Todos os componentes estão prontos e integrados. Configure as variáveis de ambiente e o Google Cloud Console para começar a usar.
