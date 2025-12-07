# Turso Setup Guide (SQLite Cloud - GRÁTIS)

## 1. Instalar CLI do Turso

```powershell
# Windows (PowerShell)
irm https://get.turso.tech/install.ps1 | iex
```

## 2. Criar conta (gratuita)

```bash
turso auth signup
# Abre navegador para login
```

## 3. Criar banco de dados

```bash
turso db create qlik-codex-analytics

# Output:
# Created database qlik-codex-analytics
# URL: libsql://qlik-codex-analytics-xxxxx.turso.io
```

## 4. Obter token de autenticação

```bash
turso db tokens create qlik-codex-analytics

# Output: eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## 5. Configurar no Render

No Dashboard do Render → Environment Variables:

```
TURSO_DATABASE_URL=libsql://qlik-codex-analytics-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

## 6. Instalar dependência

```powershell
cd server
npm install @libsql/client
```

## 7. Deploy

```bash
git add .
git commit -m "Add Turso support"
git push
```

**PRONTO!** Sistema funciona automaticamente.

---

## Vantagens Turso vs Supabase

| Feature | Turso | Supabase |
|---------|-------|----------|
| **Setup** | 3 comandos | Muitos passos |
| **Custo** | 🆓 Grátis | 🆓 Grátis |
| **Tipo** | SQLite | PostgreSQL |
| **Mudança código** | ⭐ Mínima | ⭐⭐⭐ Média |
| **Latência** | ⚡ Edge (rápido) | 🌍 Global |

---

## Prós e Contras

✅ **Prós**:
- Continua usando SQLite (mesma sintaxe)
- Edge computing (super rápido)
- CLI simples
- Gratuito permanente

⚠️ **Contras**:
- Pequena mudança de código necessária (usar @libsql/client)
