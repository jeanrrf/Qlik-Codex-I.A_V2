# 🚀 Guia Rápido - Configurar Turso (SQLite na Cloud)

## ✅ Passos para Configurar (5 minutos)

### 1️⃣ Instalar CLI do Turso

**Windows (PowerShell como Admin)**:
```powershell
irm https://get.turso.tech/install.ps1 | iex
```

**Mac/Linux**:
```bash
curl -sSfL https://get.turso.tech/install.sh | bash
```

---

### 2️⃣ Criar Conta (Gratuita)

```bash
turso auth signup
```

✅ Abrirá seu navegador para fazer login (GitHub ou Email)

---

### 3️⃣ Criar Banco de Dados

```bash
turso db create qlik-codex-analytics
```

**Output esperado**:
```
Created database qlik-codex-analytics at region sjc (San Jose, CA)
URL: libsql://qlik-codex-analytics-[seu-username].turso.io
```

---

### 4️⃣ Obter Token de Autenticação

```bash
turso db tokens create qlik-codex-analytics
```

**Output esperado**:
```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MzM...
```

✅ **COPIE ESTE TOKEN** (você vai precisar dele)

---

### 5️⃣ Obter URL do Banco

```bash
turso db show qlik-codex-analytics --url
```

**Output esperado**:
```
libsql://qlik-codex-analytics-[seu-username].turso.io
```

✅ **COPIE ESTA URL**

---

### 6️⃣ Configurar no Render

1. **Acesse Render Dashboard**: https://dashboard.render.com
2. **Selecione seu serviço** (Qlik Codex I.A)
3. **Vá em Environment**
4. **Adicione 2 variáveis**:

```
TURSO_DATABASE_URL=libsql://qlik-codex-analytics-[seu-username].turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

5. **Salve as mudanças**

---

### 7️⃣ Deploy

O Render fará deploy automático ao detectar as novas variáveis.

✅ **PRONTO!** Sistema agora usa Turso automaticamente.

---

## 🔍 Como Verificar se Está Funcionando

### **Opção 1: Logs do Render**

Procure por:
```
Initializing database: turso
Turso database initialized
Turso tables created successfully
```

### **Opção 2: Acessar Dashboard Analytics**

1. Faça login na aplicação
2. Acesse Analytics Dashboard
3. Navegue pela plataforma
4. Veja dados aparecendo no dashboard

### **Opção 3: CLI do Turso**

```bash
# Ver tabelas criadas
turso db shell qlik-codex-analytics

# No shell do Turso:
.tables
SELECT COUNT(*) FROM analytics_page_views;
SELECT COUNT(*) FROM analytics_events;
.quit
```

---

## 📊 Comandos Úteis do Turso

### Ver seus bancos de dados
```bash
turso db list
```

### Ver informações do banco
```bash
turso db show qlik-codex-analytics
```

### Acessar shell SQL
```bash
turso db shell qlik-codex-analytics
```

### Ver uso (quota)
```bash
turso db inspect qlik-codex-analytics
```

### Criar backup
```bash
turso db dump qlik-codex-analytics > backup.sql
```

---

## 🆓 Limites do Plano Gratuito

| Recurso | Limite Gratuito |
|---------|-----------------|
| **Armazenamento** | 500 MB |
| **Rows lidas/mês** | 1 bilhão |
| **Rows escritas/mês** | 25 milhões |
| **Bancos de dados** | 3 |
| **Localizações** | 3 regiões |

✅ **Mais que suficiente** para seu caso de uso!

---

## 🔄 Desenvolvimento Local vs Produção

O sistema detecta automaticamente:

- **Local** (sem `TURSO_DATABASE_URL`): Usa SQLite em `server/data/qlik-codex.db`
- **Render** (com `TURSO_DATABASE_URL`): Usa Turso na cloud

**Zero mudança de código necessária!**

---

## 🚨 Troubleshooting

### "Error: TURSO_DATABASE_URL must be set"

✅ Certifique-se de adicionar as variáveis no Render

### "Authentication failed"

✅ Regere o token: `turso db tokens create qlik-codex-analytics`

### "Table already exists"

✅ Normal, sistema cria tabelas automaticamente na primeira execução

### Dados não aparecem

1. Verifique logs do Render
2. Confirme que variáveis estão configuradas
3. Acesse shell do Turso para ver dados diretamente

---

## 📞 Suporte Turso

- **Docs**: https://docs.turso.tech
- **Discord**: https://discord.gg/turso
- **Status**: https://status.turso.tech

---

## ✨ Pronto!

Você agora tem:
- ✅ SQLite na cloud (Cloudflare Edge)
- ✅ Persistência garantida
- ✅ 100% gratuito (até 500MB)
- ✅ Super rápido (edge computing)
- ✅ Backup automático

**Tempo total**: ~5 minutos
**Custo**: $0/mês
**Complexidade**: ⭐⭐ Muito simples
