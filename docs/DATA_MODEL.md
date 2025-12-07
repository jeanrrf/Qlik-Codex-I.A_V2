Data model — onde os dados importantes estão armazenados
=====================================================

Resumo rápido das tabelas mais relevantes e o que guardam:

- users — informações dos usuários (email, name, role, google_id, created_at, last_login, is_active)
- auth_sessions — tokens de autenticação, refresh tokens, ip, user_agent, expire_at (são suas "auth tokens")
- contact_messages — mensagens de leads / formulários de contato (name, email, company, message)
- analytics_page_views, analytics_events, analytics_sessions — sistema de monitoramento (page views, eventos, sessões)
- optimization_history — histórico de otimizações, metadados e resultados (scripts não são persistidos por segurança)
- llm_cache — cache de respostas LLM para reduzir custos/latência
- active_sessions — sessões ativas de otimização (meta-data, não guarda scripts completos)
- audit_logs — logs de auditoria (ações, entidades acessadas)
- user_daily_usage — controle de uso por usuário (base para limitação de cota / free tier)

Onde procurar cada item
------------------------
- Cotas / limites: implementadas com `user_daily_usage` e serviços em `server/src/services/usageQuotaService.ts`.
- Leads / contatos: `contact_messages` (tratados em `server/src/services/contactService.ts` e `server/src/routes/contact.routes.ts`).
- Tokens / sessões: `auth_sessions` (gerados em `server/src/services/authService.ts`).

Importante — persistência em produção
-------------------------------------
- Para garantir que dados não sejam perdidos nos redeploys, configure o banco em produção (Turso ou Postgres). O arquivo `render.yaml` já foi atualizado para buildar frontend e servidor, e temos suporte para Turso.
- Em produção, **não use** SQLite (armazenamento local é efêmero em serviços como Render free tier). Use Turso e verifique backups regulares.

Backup / restauração
--------------------
- Turso dashboard permite execução de queries e export/backup via UI/CLI.
- Para exportar localmente (SQLite): `sqlite3 server/data/qlik-codex.db .dump > qlik_dump.sql`.
