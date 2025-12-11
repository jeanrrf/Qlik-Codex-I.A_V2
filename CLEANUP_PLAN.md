# 🧹 Plano de Sanitização da Codebase - Qlik Codex I.A

## 📊 Análise Atual

### Arquivos Identificados para Limpeza

#### 1. ❌ Arquivos Temporários/Snippet (REMOVER)
- `_snippet.txt` - Código de desenvolvimento temporário
- `server/lint_report.txt` - Relatório de lint antigo

#### 2. 📄 Documentação Duplicada/Desatualizada

**Arquivos para CONSOLIDAR**:
- `README.md` (root)
- `server/README.md`
- `web/README.md`
- `server/DATABASE.md`

**Novos documentos criados recentemente (MANTER)**:
- ✅ `DEPLOY_CHECKLIST.md`
- ✅ `docs/PRODUCTION_SETUP.md`
- ✅ `CHANGELOG_LOGIN_FIX.md`
- ✅ `AGENTS.md`

#### 3. 🔧 Arquivos de Configuração

**Para REVISAR**:
- `.env.turso.example` - Duplicado de `.env.example` (consolidar)
- `codex-models` - Verificar se está em uso

#### 4. 📁 Estrutura de Pastas

**Para ORGANIZAR**:
- `server/docs/` - Consolidar com `docs/` principal
- `.agent/` - Verificar necessidade

---

## 🎯 Plano de Execução

### Fase 1: Remover Arquivos Temporários ✅

```bash
# Arquivos para deletar
rm _snippet.txt
rm server/lint_report.txt
```

### Fase 2: Consolidar Documentação 📚

#### 2.1. Criar Documentação Principal Unificada

**Novo arquivo**: `docs/README.md` (Índice central de documentação)

Conteúdo:
- Link para guias de setup
- Link para arquitetura
- Link para deployment
- Link para troubleshooting

#### 2.2. Mover Documentos do Server

```bash
# Mover docs do server para docs central
mv server/docs/EXTREME_MODE_IMPLEMENTATION.md docs/
mv server/docs/EXTREME_MODE_FORMATTER.md docs/
mv server/docs/EXTREME_MODE_EXAMPLES.qvs docs/examples/
mv server/docs/FORMATTING_TEMPLATE.qvs docs/examples/
```

#### 2.3. Consolidar README.md (Root)

**Simplificar** o README principal para focar em:
- Quick Start
- Links para documentação detalhada (em `docs/`)
- Arquitetura de alto nível (diagrama simples)

#### 2.4. Manter READMEs Específicos (server/web)

Manter apenas informações **técnicas específicas** de cada módulo:
- `server/README.md`: Arquitetura backend, rotas, serviços
- `web/README.md`: Componentes, hooks, estrutura frontend

### Fase 3: Consolidar Arquivos .env 🔐

```bash
# Remover duplicação
rm server/.env.turso.example
```

**Atualizar** `server/.env.example` para incluir seção do Turso

### Fase 4: Reorganizar Pastas 📂

#### 4.1. Estrutura Final de `docs/`

```
docs/
├── README.md                    # Índice central (NOVO)
├── PRODUCTION_SETUP.md          # ✅ Já existe
├── ARCHITECTURE.md              # NOVO (consolidar info dos READMEs)
├── EXTREME_MODE_IMPLEMENTATION.md
├── EXTREME_MODE_FORMATTER.md
├── examples/
│   ├── EXTREME_MODE_EXAMPLES.qvs
│   └── FORMATTING_TEMPLATE.qvs
└── guides/
    ├── DEPLOYMENT.md            # Link para DEPLOY_CHECKLIST.md
    └── DATABASE.md              # Mover de server/DATABASE.md
```

#### 4.2. Simplificar Root

```
root/
├── README.md                    # Simplificado
├── AGENTS.md                    # ✅ Manter
├── DEPLOY_CHECKLIST.md          # ✅ Manter
├── CHANGELOG_LOGIN_FIX.md       # ✅ Manter (histórico)
├── docs/                        # Toda doc técnica
├── server/
├── web/
└── tools/
```

### Fase 5: Limpeza de Código ⚙️

#### 5.1. Verificar `codex-models`

Confirmar se está em uso ou pode ser removido.

#### 5.2. Limpar `.agent/` (se não estiver em uso)

Se a pasta `.agent/` não for essencial, considerar remoção.

---

## ✅ Checklist de Validação Pós-Limpeza

- [ ] Build funciona (`npm run build`)
- [ ] Testes passam (`npm test`)
- [ ] Links nos READMEs apontam corretamente
- [ ] Documentação está acessível e organizada
- [ ] Não há referências quebradas
- [ ] .gitignore atualizado se necessário

---

## 📋 Estrutura Final Esperada

### Documentação Clara e Centralizada

```
docs/
├── README.md               # "Table of Contents" da documentação
├── ARCHITECTURE.md         # Visão geral da arquitetura
├── PRODUCTION_SETUP.md     # Setup de produção (Turso, Render, Vercel)
├── DATABASE.md             # Estrutura do banco de dados
├── EXTREME_MODE_*          # Documentação de features avançadas
├── examples/               # Exemplos de código
└── guides/                 # Guias específicos
```

### READMEs Focados

- **Root README**: Quick start + links para `docs/`
- **Server README**: Detalhes técnicos do backend
- **Web README**: Detalhes técnicos do frontend

### Sem Arquivos Temporários

- ❌ Nenhum `*.txt`, `*.log`, `*.bak`, `*.tmp` no raiz
- ❌ Nenhum snippet de código solto
- ✅ Apenas arquivos de configuração essenciais

---

## 🚀 Benefícios Esperados

1. **Mais fácil de navegar** - Documentação centralizada em `docs/`
2. **Menos confusão** - Sem arquivos duplicados ou obsoletos
3. **Onboarding rápido** - README simplificado aponta para docs
4. **Manutenção facilitada** - Estrutura clara e previsível
5. **Profissional** - Sem arquivos temporários ou snippets

---

## 📝 Notas de Implementação

### Prioridade Alta (Fazer Agora)
1. Remover arquivos temporários (`_snippet.txt`, `lint_report.txt`)
2. Criar `docs/README.md` (índice)
3. Mover docs do `server/docs/` para `docs/`

### Prioridade Média (Próximos Dias)
4. Consolidar `.env.example`
5. Simplificar README principal
6. Criar `docs/ARCHITECTURE.md`

### Prioridade Baixa (Opcional)
7. Revisar necessidade de `.agent/`
8. Verificar `codex-models`

---

**Criado em**: 11 de Dezembro de 2025  
**Status**: Aguardando aprovação para executar
