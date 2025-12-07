# Arquitetura de Analytics Enterprise - Qlik Codex I.A

## 📊 Visão Geral

Sistema completo de monitoramento de acessos, eventos e comportamento de usuários, com distinção especial para o **Owner** da plataforma.

---

## 🏗️ Arquitetura Completa

### **1. Backend (Server)**

#### **Serviço Principal**
- **Arquivo**: `server/src/services/analyticsService.ts`
- **Funções**:
  - `trackPageView()` - Rastreia visualização de páginas
  - `trackEvent()` - Rastreia eventos customizados
  - `startSession()` - Inicia sessão de navegação
  - `getAnalyticsSummary()` - Resumo de KPIs
  - `getDetailedAnalytics()` - Dados detalhados com filtros
  - `cleanOldAnalytics()` - GDPR compliance (limpa dados antigos)

#### **Rotas API**
- **Arquivo**: `server/src/routes/analytics.routes.ts`

**Endpoints Públicos (tracking)**:
- `POST /api/analytics/pageview` - Registra page view
- `POST /api/analytics/event` - Registra evento customizado
- `POST /api/analytics/session/start` - Inicia sessão

**Endpoints Protegidos (owner only)**:
- `GET /api/analytics/summary` - Resumo de analytics
- `GET /api/analytics/detailed` - Dados detalhados com filtros
- `GET /api/analytics/realtime` - Stream SSE de eventos em tempo real
- `DELETE /api/analytics/cleanup` - Limpa dados antigos

#### **Banco de Dados (SQLite)**
- **Arquivo**: `server/src/lib/sqliteDb.ts`

**Tabelas Criadas**:

1. **analytics_page_views**
   - Rastreia todas as visualizações de página
   - Campos: `user_id`, `session_id`, `page`, `referrer`, `ip`, `user_agent`, `is_owner`, `metadata`, `timestamp`
   - Índices otimizados para consultas rápidas

2. **analytics_events**
   - Rastreia eventos customizados (cliques, submits, erros, etc.)
   - Campos: `user_id`, `session_id`, `event_type`, `event_category`, `event_label`, `event_value`, `is_owner`, `metadata`, `timestamp`

3. **analytics_sessions**
   - Sessões de navegação completas
   - Campos: `session_id`, `user_id`, `ip`, `user_agent`, `is_owner`, `landing_page`, `page_count`, `event_count`, `start_time`, `last_activity`

---

### **2. Frontend (Web)**

#### **Hook de Analytics**
- **Arquivo**: `web/src/hooks/useAnalytics.ts`
- **Funcionalidades**:
  - Tracking automático de page views
  - Session ID persistente (sessionStorage)
  - Detecção automática de Owner
  - Atalhos para eventos comuns:
    - `trackClick()`
    - `trackFormSubmit()`
    - `trackError()`
    - `trackOptimization()`
    - `trackFeatureUse()`
  - HOC `withAnalytics()` para componentes

#### **Dashboard de Analytics**
- **Arquivo**: `web/src/pages/Analytics/AnalyticsDashboard.tsx`
- **Acesso**: Apenas Owner
- **Funcionalidades**:
  - **Tab "Resumo"**:
    - KPIs principais (visitas, eventos, sessões, otimizações, usuários únicos)
    - Separação de métricas Owner vs Geral
    - Top páginas mais visitadas
    - Top eventos mais frequentes
    - Timeline de atividade recente
  - **Tab "Tempo Real"**:
    - Stream SSE de eventos em tempo real
    - Badge visual para eventos do Owner
    - Feed ao vivo de page views e events
  - **Tab "Detalhado"**:
    - Placeholder para análise avançada futura

#### **Integração no App**
- **Arquivo**: `web/src/App.tsx`
- Hook `useAnalytics()` integrado no `AppContent`
- Tracking automático de mudança de views
- Rota `/analytics` protegida

#### **Menu de Navegação**
- **Arquivo**: `web/src/components/UserMenu.tsx`
- Botão "📊 Analytics Dashboard" visível apenas para Owner

---

## 🔐 Segurança e Controle de Acesso

### **Distinção Owner vs Usuário**

1. **Backend**:
   - Campo `is_owner` em todas as tabelas
   - Middleware `requireAuth` valida role
   - Endpoints protegidos retornam 403 para não-owners

2. **Frontend**:
   - Hook `useAuth()` fornece `isOwner()`
   - Dashboard renderiza erro se não for Owner
   - Menu mostra botão apenas para Owner

### **Privacidade (GDPR)**
- Função `cleanOldAnalytics(daysToKeep)` remove dados antigos
- Endpoint DELETE para limpeza manual
- Metadata opcional (não obrigatório)

---

## 📈 Fluxo de Dados

### **1. Tracking de Page View**

```
Usuário navega para página
  ↓
useAnalytics() detecta mudança de rota (useEffect)
  ↓
trackPageView() envia POST /api/analytics/pageview
  ↓
Backend registra em analytics_page_views
  ↓
Atualiza analytics_sessions.last_activity
```

### **2. Tracking de Evento**

```
Usuário clica em botão (ex: otimizar)
  ↓
Componente chama analytics.trackEvent()
  ↓
POST /api/analytics/event
  ↓
Backend registra em analytics_events
  ↓
Se stream SSE ativo → envia para dashboard em tempo real
```

### **3. Visualização no Dashboard**

```
Owner acessa /analytics
  ↓
Dashboard carrega GET /api/analytics/summary
  ↓
Exibe KPIs em cards glassmorphism
  ↓
Owner ativa tab "Tempo Real"
  ↓
EventSource conecta em /api/analytics/realtime (SSE)
  ↓
Backend pooling a cada 2s
  ↓
Novos eventos aparecem instantaneamente no feed
```

---

## 🎨 Design System

- **Tema**: Glassmorphism com gradiente roxo (`#667eea → #764ba2`)
- **Cards**: Background `rgba(255,255,255,0.95)` com `backdrop-filter: blur(10px)`
- **Animações**: `slideIn`, `pulse`, `translateY` em hover
- **Badge Owner**: Gradiente dourado `#ffd700 → #ffed4e`
- **Responsivo**: Grid adaptativo para mobile

---

## 🚀 Deploy e Manutenção

### **Inicialização**
- Tabelas criadas automaticamente em `initSqliteDb()`
- Migrations idempotentes (safe to re-run)

### **Performance**
- Índices otimizados em todas as colunas de filtro
- Query limit padrão: 10-100 registros
- SSE pooling: 2 segundos (customizável)

### **Monitoramento**
- Logs via `logger.debug()` em cada tracking
- Errors capturados e logados sem quebrar aplicação

---

## 📊 Métricas Disponíveis

### **KPIs Principais**
- Total de Visitas
- Total de Eventos
- Total de Sessões
- Total de Otimizações IA
- Usuários Únicos
- **Visitas do Owner** (separado)
- **Eventos do Owner** (separado)

### **Análises**
- Top N páginas mais visitadas
- Top N eventos mais frequentes
- Atividade recente (mix de page views + events + sessions)
- Filtros por data, userId, isOwner

---

## 🔮 Roadmap Futuro

### **Próximas Features**
- [ ] Gráficos e dashboards visuais (Chart.js ou Recharts)
- [ ] Funis de conversão
- [ ] Heatmaps de cliques
- [ ] Análise de retenção (cohorts)
- [ ] Exportação CSV/JSON
- [ ] Alertas customizados (Slack/Email)
- [ ] Integração com Google Analytics (opcional)
- [ ] A/B testing framework

---

## 💡 Como Usar (Developer Guide)

### **1. Rastrear page view customizado**
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function MyComponent() {
  const { trackPageView } = useAnalytics();
  
  useEffect(() => {
    trackPageView('/custom-page');
  }, []);
}
```

### **2. Rastrear evento customizado**
```typescript
const { trackEvent } = useAnalytics();

function handleButtonClick() {
  trackEvent({
    eventType: 'button_click',
    eventCategory: 'engagement',
    eventLabel: 'cta_hero',
    eventValue: 1,
    metadata: { source: 'landing_page' }
  });
}
```

### **3. Atalhos rápidos**
```typescript
const { trackClick, trackFormSubmit, trackError } = useAnalytics();

// Clique
trackClick('download_report', 1);

// Form submit
trackFormSubmit('contact_form', true);

// Erro
trackError('API timeout', { endpoint: '/api/optimize' });
```

### **4. HOC para tracking automático**
```typescript
import { withAnalytics } from '@/hooks/useAnalytics';

const MyFeature = () => <div>Feature</div>;

export default withAnalytics(MyFeature, 'advanced_editor');
```

---

## 🎯 Observações Importantes

### **Owner Detection**
- Backend verifica `req.user?.role === 'owner'`
- Frontend usa `isOwner()` do AuthContext
- Todos os eventos do owner têm `is_owner = 1`

### **Session ID**
- Gerado automaticamente no primeiro acesso
- Persistido em `sessionStorage`
- Formato: `session_{timestamp}_{random}`

### **Backward Compatibility**
- Endpoints antigos `/visit` e `/stats` mantidos
- Tabela `page_visits` ainda existe (legacy)

### **Performance Tips**
- Usar `limit` em queries detalhadas
- Limpar dados antigos periodicamente
- Desativar debug em produção

---

## 📞 Suporte

Para dúvidas ou melhorias, contate o time de desenvolvimento.

**Sistema implementado em**: Dezembro 2025  
**Status**: ✅ Produção Ready
