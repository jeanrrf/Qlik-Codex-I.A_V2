# 🚀 Ativação do Turso - Método Alternativo (Dashboard Web)

## ⚠️ Problema Detectado

O instalador CLI do Turso está bloqueado neste ambiente (firewall/proxy corporativo).

**Solução**: Usar o Dashboard Web do Turso (mais fácil ainda!)

---

## ✅ Passos para Ativar Turso (3 minutos)

### **1️⃣ Criar Conta no Turso**

Acesse: **https://turso.tech/app**

- Clique em "Sign Up"
- Use GitHub ou Email
- É **100% gratuito**

---

### **2️⃣ Criar Banco de Dados**

No Dashboard do Turso:

1. Clique em **"Create Database"**
2. **Name**: `qlik-codex-analytics`
3. **Location**: `São Paulo` ou `San Jose` (mais próximo)
4. Clique em **"Create"**

---

### **3️⃣ Obter Credenciais**

Após criar o banco, você verá:

**Database URL**:
```
libsql://qlik-codex-analytics-[seu-username].turso.io
```
✅ **COPIE esta URL**

**Auth Token**:
1. Clique em **"Create Token"**
2. Nome: `render-production`
3. Permissions: `Read & Write`
4. Clique em **"Create"**
5. ✅ **COPIE o token** (começa com `eyJ...`)

⚠️ **IMPORTANTE**: Salve o token em local seguro! Não será mostrado novamente.

---

### **4️⃣ Configurar no Render**

1. Acesse: **https://dashboard.render.com**
2. Selecione seu serviço **Qlik Codex I.A**
3. Vá em **"Environment"** (menu lateral)
4. Clique em **"Add Environment Variable"**

**Adicione estas 2 variáveis**:

```
TURSO_DATABASE_URL = libsql://qlik-codex-analytics-[seu-username].turso.io
```

```
TURSO_AUTH_TOKEN = eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

5. Clique em **"Save Changes"**

---

### **5️⃣ Deploy Automático**

O Render detectará as mudanças e fará deploy automático.

**Aguarde 2-3 minutos** para o deploy completar.

---

### **6️⃣ Verificar se Funcionou**

#### **Opção A: Logs do Render**

No Dashboard do Render → **Logs**

Procure por:
```
✅ Initializing database: turso
✅ Turso database initialized
✅ Turso tables created successfully
```

#### **Opção B: Turso Dashboard**

No Dashboard do Turso → Seu Banco → **"Query"**

Execute:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Você deve ver:
- `analytics_page_views`
- `analytics_events`
- `analytics_sessions`

#### **Opção C: Analytics Dashboard**

1. Acesse sua aplicação
2. Faça login
3. Navegue pelo site
4. Acesse **Analytics Dashboard**
5. Veja dados aparecendo ✅

---

## 🎯 Resumo Visual

```
1. turso.tech/app → Sign Up
         ↓
2. Create Database → qlik-codex-analytics
         ↓
3. Copiar URL + Token
         ↓
4. Render Dashboard → Environment Variables
         ↓
5. Aguardar Deploy (2-3min)
         ↓
6. ✅ Pronto! Dados persistem na cloud
```

---

## 🆓 Benefícios

- ✅ **500 MB** grátis para sempre
- ✅ **Persistência garantida** (não perde dados)
- ✅ **Edge computing** (super rápido)
- ✅ **Backups automáticos**
- ✅ **Dashboard visual** para consultas SQL

---

## 📊 Comandos SQL Úteis (Dashboard Turso)

### Ver total de registros
```sql
SELECT COUNT(*) as total FROM analytics_page_views;
SELECT COUNT(*) as total FROM analytics_events;
SELECT COUNT(*) as total FROM analytics_sessions;
```

### Ver últimas visitas
```sql
SELECT page, timestamp, is_owner 
FROM analytics_page_views 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Ver eventos do owner
```sql
SELECT event_type, event_category, timestamp 
FROM analytics_events 
WHERE is_owner = 1 
ORDER BY timestamp DESC;
```

---

## 🔄 Desenvolvimento Local

Para testar localmente (opcional):

1. Copie as mesmas credenciais
2. Crie arquivo `server/.env`:
```bash
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=eyJ...
```
3. Rode: `npm run dev`
4. Mesmo banco em local e produção ✅

---

## 🚨 Troubleshooting

### "Authentication failed"
→ Regere o token no Dashboard do Turso

### "Database not found"
→ Verifique o nome exato do banco (case-sensitive)

### Dados não aparecem
→ Verifique logs do Render para erros
→ Execute queries SQL direto no Dashboard Turso

---

## 📞 Suporte

- **Dashboard Turso**: https://turso.tech/app
- **Docs**: https://docs.turso.tech
- **Discord**: https://discord.gg/turso

---

## ✨ Pronto!

Método alternativo **ainda mais simples** que CLI!

- ⏱️ **Tempo**: 3 minutos
- 💰 **Custo**: $0
- 🔧 **Complexidade**: ⭐ Muito fácil
- 🎨 **Interface**: Dashboard visual bonito
