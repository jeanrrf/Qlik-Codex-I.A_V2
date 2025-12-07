Turso Migration — passos rápidos
================================

Esse documento descreve como migrar os dados locais (SQLite) para o banco Turso.

Pré-requisitos
--------------
- Ter `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` configurados no ambiente.
- Ter o arquivo SQLite local: `server/data/qlik-codex.db` (geralmente já existe no servidor dev).
- Ter `node` instalado (rodar script com Node.js).

Passos (rápido)
---------------
1. Build/compile o servidor (caso use TypeScript): `npm run build --prefix server`
2. Configure as env vars:
   - TURSO_DATABASE_URL
   - TURSO_AUTH_TOKEN
3. Execute o script de migração:

```bash
# no root do repo
node server/scripts/migrate_sqlite_to_turso.js
```

O script tentará copiar as tabelas principais (users, auth_sessions, contact_messages, optimization_history, analytics_* e outras) do banco local para o Turso.

Validação
---------
Abra o dashboard do Turso → Query e execute:

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

Você deve ver todas as tabelas listadas (users, auth_sessions, analytics_page_views, analytics_events, analytics_sessions, optimization_history, etc.).

Notas
-----
- O script tenta inserir linhas e ignora erros de inserção (ex.: duplicated primary key).
- Se a base local tiver dados sensíveis (scripts) eles não são migrados — isso é intencional para privacidade.

Se preferir, posso executar essa migração para você e validar no Turso (preciso que forneça as credenciais TURSO_* no Render ou aqui).
