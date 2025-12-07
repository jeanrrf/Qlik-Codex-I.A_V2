# 📊 Guia Rápido - Analytics Dashboard

## Como Acessar

### **Para o Owner (Proprietário)**

1. **Faça login** na plataforma Qlik Codex I.A
2. Clique no seu **avatar/nome** no canto superior direito
3. No menu dropdown, clique em **"📊 Analytics Dashboard"**
4. Dashboard abrirá com todos os dados de monitoramento

### **Para Usuários Comuns**

❌ Usuários comuns **não têm acesso** ao Analytics Dashboard. Este recurso é exclusivo para o proprietário da plataforma.

---

## 🎯 O Que Você Pode Ver

### **Tab: Resumo (Principal)**

**KPIs Visíveis**:
- 👁️ **Total de Visitas** - Quantas páginas foram acessadas
- ⚡ **Total de Eventos** - Quantas ações foram executadas
- 🔗 **Sessões** - Quantas sessões de navegação aconteceram
- 🤖 **Otimizações IA** - Quantas otimizações foram executadas
- 👥 **Usuários Únicos** - Quantos usuários diferentes acessaram

**Métricas Especiais**:
- Cada KPI mostra **"Owner: X"** para distinguir suas próprias ações

**Top Rankings**:
- 🔝 **Páginas Mais Visitadas** - Ranking das páginas com mais acessos
- ⚡ **Eventos Mais Frequentes** - Ranking dos eventos mais disparados

**Atividade Recente**:
- Timeline com últimas ações (page views + eventos + sessões)
- Badge **👑 OWNER** aparece nas suas próprias ações

**Ações**:
- 🔄 **Atualizar** - Recarrega dados manualmente
- 🗑️ **Limpar Dados Antigos** - Remove analytics com +90 dias (GDPR)

---

### **Tab: Tempo Real**

**O que é?**
Stream ao vivo de eventos acontecendo **neste exato momento** na plataforma.

**Como Funciona**:
- Conecta via Server-Sent Events (SSE)
- Atualiza automaticamente a cada 2 segundos
- Mostra eventos conforme acontecem

**O que aparece**:
- 👁️ **Page Views** - Alguém acessou uma página
- ⚡ **Events** - Alguém executou uma ação
- Badge **👑** indica que foi você (owner)

**Exemplo**:
```
⚡ event
optimization - ai_execution
10:45:23
👑
```

---

### **Tab: Detalhado**

🚧 **Em breve**: Análise avançada, filtros, gráficos e exportação de dados.

---

## 🔍 Como Interpretar os Dados

### **Distinguindo Suas Ações vs Usuários**

**Suas Ações (Owner)**:
- Cards mostram **"Owner: X"**
- Timeline: itens com badge **👑 OWNER**
- Background dourado/amarelo
- Tempo real: badge **👑** ao lado

**Ações de Usuários**:
- Contam no total geral
- Sem badge especial
- Background padrão (roxo claro)

### **Exemplo Prático**

Você vê:
```
Total de Visitas: 1,250
Owner: 87
```

**Interpretação**: 
- 1.250 visitas totais na plataforma
- 87 foram **suas** visitas
- 1.163 foram de outros usuários

---

## 📈 Casos de Uso

### **1. Monitorar Uso da Plataforma**
- Quantas pessoas estão usando?
- Quais páginas são mais populares?
- Quantas otimizações IA estão rodando?

### **2. Identificar Suas Próprias Ações**
- Separar seus testes de uso real
- Ver padrões de uso próprio
- Não confundir seus acessos com métricas de usuários

### **3. Análise de Comportamento**
- Quais features são mais usadas?
- Onde os usuários passam mais tempo?
- Quais eventos são mais frequentes?

### **4. Debugging e Troubleshooting**
- Ver eventos em tempo real
- Identificar problemas rapidamente
- Monitorar erros e falhas

---

## ⚙️ Configurações e Limpeza

### **Limpar Dados Antigos**

**Por que fazer?**
- Compliance GDPR
- Melhorar performance do banco
- Manter apenas dados relevantes

**Como fazer?**
1. Clique em **"🗑️ Limpar Dados Antigos"**
2. Confirme a ação
3. Sistema remove analytics com **mais de 90 dias**

**⚠️ Atenção**: Ação irreversível!

---

## 🔒 Segurança e Privacidade

### **Quem Pode Ver**
- ✅ Apenas o **Owner** (você)
- ❌ Usuários comuns não veem nada
- ❌ Não há API pública

### **Dados Rastreados**
- Páginas visitadas
- Eventos de ação (cliques, submits)
- Sessões de navegação
- IP e User-Agent (para analytics)

### **Dados NÃO Rastreados**
- Scripts de usuários
- Dados sensíveis ou pessoais
- Senhas ou tokens
- Conteúdo de formulários (apenas submit)

---

## 🚨 Troubleshooting

### **"Acesso negado. Apenas o proprietário pode visualizar analytics."**
- Você não está logado como Owner
- Verifique seu role no perfil

### **"Erro ao carregar analytics"**
- Verifique conexão com backend
- Veja console do navegador (F12)
- Recarregue a página

### **"Aguardando eventos..." não atualiza**
- Normal quando não há atividade
- Teste navegando em outra aba
- Verifique status de conexão SSE

### **Dashboard em branco**
- Ainda não há dados coletados
- Navegue pela plataforma primeiro
- Aguarde alguns minutos

---

## 💡 Dicas Pro

### **1. Deixe Tempo Real Aberto**
Mantenha a tab "Tempo Real" aberta em monitor secundário para monitorar atividade ao vivo.

### **2. Use Filtros (Futuro)**
Quando implementado, use filtros de data para análise histórica.

### **3. Export Regular (Futuro)**
Quando disponível, exporte dados mensalmente para backup.

### **4. Limpeza Periódica**
Rode limpeza a cada 3 meses para manter DB saudável.

### **5. Correlacione com Logs**
Compare analytics com logs do servidor para debug avançado.

---

## 📞 Suporte

Se encontrar bugs ou tiver sugestões:
1. Verifique console do navegador (F12)
2. Anote mensagem de erro
3. Contate equipe de desenvolvimento

---

**Implementado em**: Dezembro 2025  
**Status**: ✅ Produção Ready  
**Acesso**: 👑 Owner Only
