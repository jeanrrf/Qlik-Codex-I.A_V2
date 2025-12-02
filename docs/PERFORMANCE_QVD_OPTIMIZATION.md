# AINEX Performance Optimization - QVD/QVS Files

**Data:** 30/11/2025  
**Versão:** 0.2.2  
**Status:** ✅ Implementado

## 🎯 Problema Identificado

Arquivos QVD/QVS grandes estavam causando timeouts e performance degradada na pipeline AINEX devido a:
- Prompts muito longos (+40k tokens)
- Timeout fixo de 180s insuficiente
- Processamento monolítico sem adaptação ao tamanho do arquivo
- Falta de estratégia específica para arquivos Qlik nativos

## 🚀 Solução Implementada

### 1. **Sistema de Análise Inteligente de Scripts** (`scriptAnalyzer.ts`)

Nova biblioteca que detecta características do script e recomenda estratégia otimizada:

```typescript
// Análise automática
const characteristics = analyzeScriptCharacteristics(script, filename);

// Retorna:
{
  fileType: 'qvd' | 'qvs' | 'txt',
  size: 'small' | 'medium' | 'large' | 'xlarge',
  complexity: 'low' | 'medium' | 'high' | 'critical',
  hasQVDOperations: boolean,
  qvdReadCount: number,
  qvdWriteCount: number,
  estimatedTokens: number,
  recommendedStrategy: 'full' | 'optimized' | 'chunked'
}
```

**Thresholds (configuráveis em `config.ts`):**
- QVD/QVS: >800 linhas OU >40k tokens → CHUNKED
- Qualquer: >1500 linhas OU >80k tokens → CHUNKED

### 2. **Chunking Inteligente com Overlap**

Divide scripts grandes em blocos mantendo contexto:

```typescript
const strategy = generateChunkStrategy(characteristics);
// Gera: { chunkSize, overlapLines, focusAreas }

const chunks = createScriptChunks(script, strategy);
// Retorna chunks com contexto preservado (15% overlap)
```

**Tamanhos de chunk adaptativos:**
- Complexidade baixa: 400 linhas
- Complexidade média: 300 linhas
- Complexidade alta: 200 linhas
- Complexidade crítica: 150 linhas

### 3. **Processamento em Modo Chunked**

Duas novas funções no `optimizerService.ts`:

#### `runAnalysisModeChunked()`
- Processa cada chunk individualmente
- Identifica issues por bloco
- **Consolida resultados** removendo duplicatas
- Retorna script original + relatório unificado

#### `runUltraExpertModeChunked()`
- Otimiza cada chunk separadamente
- Reconstrói script otimizado
- **Validação final** antes de retornar
- Fallback para modo tradicional se validação falhar

### 4. **Timeouts Dinâmicos**

Ajuste automático no `providerOrchestrator.ts`:

```typescript
// Heurística baseada em tamanho do prompt
if (estimatedTokens > 50000) {
  adjustedTimeout = timeout * 1.5;  // Até 240s
} else if (estimatedTokens < 10000) {
  adjustedTimeout = timeout * 0.7;  // Até 60s
}
```

**Timeouts base (configuráveis):**
- Full analysis: 180s
- Optimized: 120s
- Chunked (por chunk): 90s

### 5. **Consolidação de Resultados**

Função `mergeChunkResults()` que:
- Remove duplicatas por categoria/área
- Mantém mudança de maior impacto quando há conflito
- Calcula médias de métricas entre chunks
- Gera summary consolidado

## 📊 Impacto Esperado

### Performance
- **QVD 2000 linhas:** ~180s → ~90s (2x mais rápido)
- **QVS 5000 linhas:** Timeout → 3-5 chunks × 90s = sucesso
- **Scripts complexos:** Análise mais precisa por área

### Qualidade
- ✅ Mantém poder da AINEX (todos os agentes ativos)
- ✅ Overlap preserva contexto entre chunks
- ✅ Validação final garante integridade
- ✅ Fallback automático se chunking falhar

### Logs Enriquecidos
```
📊 Características: QVD | large | high complexity
📊 Tokens estimados: 52,340 | Linhas: 1,245
📦 QVD: 34 reads, 12 writes
⚡ Estratégia: CHUNKED - Análise otimizada por blocos
📦 Script dividido em 5 chunks (tamanho: 300 linhas, overlap: 45)
🎯 Áreas de foco: QVD operations, Complex joins, Anti-patterns
```

## 🔧 Configuração

### Arquivo `.env`
Não requer mudanças. Thresholds estão em `config.ts`.

### Customização (`server/src/lib/config.ts`)

```typescript
scriptAnalysis: {
  chunkingThresholds: {
    qvdQvsLineThreshold: 800,      // Ajustar conforme necessidade
    qvdQvsTokenThreshold: 40000,
    anyFileLineThreshold: 1500,
    anyFileTokenThreshold: 80000
  },
  chunkSizes: {
    low: 400,
    medium: 300,
    high: 200,
    critical: 150
  },
  overlapPercentage: 15,  // 15% overlap entre chunks
  timeouts: {
    full: 180000,
    optimized: 120000,
    chunked: 90000
  }
}
```

## 🧪 Como Testar

### 1. Script QVD Grande (>800 linhas)
```bash
# Upload de arquivo .qvs ou .qvd com muitas operações
# Verificar logs:
# - "Estratégia: CHUNKED"
# - Contagem de chunks processados
# - Tempo total < 10min
```

### 2. Script Pequeno (<200 linhas)
```bash
# Deve usar estratégia FULL (comportamento tradicional)
# Logs: "Estratégia: FULL - Análise tradicional completa"
```

### 3. Script Médio (500-800 linhas)
```bash
# Deve usar estratégia OPTIMIZED (prompt compactado)
# Logs: "Estratégia: OPTIMIZED - Análise com prompt compactado"
```

## 📁 Arquivos Modificados

### Novos Arquivos
- `server/src/lib/scriptAnalyzer.ts` - Sistema de análise e chunking (370 linhas)

### Arquivos Alterados
- `server/src/services/optimizerService.ts`
  - Adicionado análise prévia de características
  - Roteamento para estratégia apropriada
  - Funções `runAnalysisModeChunked()` e `runUltraExpertModeChunked()`
  
- `server/src/lib/providerOrchestrator.ts`
  - Timeouts dinâmicos baseados em tamanho do prompt
  - Logs enriquecidos com estimativa de tokens

- `server/src/lib/config.ts`
  - Nova seção `scriptAnalysis` com todos os thresholds

## 🎓 Padrões de Design Utilizados

1. **Strategy Pattern:** Seleção dinâmica entre full/optimized/chunked
2. **Template Method:** Estrutura comum com variações por estratégia
3. **Chain of Responsibility:** Rotação de provedores com fallback
4. **Adapter Pattern:** Consolidação de resultados de chunks diferentes

## 🔮 Melhorias Futuras

- [ ] **Processamento paralelo de chunks** (Promise.all)
- [ ] **Cache de chunks analisados** (evitar reprocessamento)
- [ ] **Streaming de resultados** (SSE chunk por chunk)
- [ ] **Detecção de áreas críticas** (focar análise em blocos problemáticos)
- [ ] **Métricas de performance** (tracking de tempos por estratégia)

## 📚 Referências Técnicas

- Google Gemini 2.5 Flash: Max 2M tokens context
- NVIDIA Nemotron: Max 128k tokens context
- Chunking overlap: Baseado em papers de RAG (15-20% ideal)
- Timeout heuristics: Ajustados empiricamente com testes

## ✅ Checklist de Deploy

- [x] Código implementado
- [x] Configurações adicionadas
- [x] Logs enriquecidos
- [x] Documentação criada
- [ ] Testes unitários (scriptAnalyzer)
- [ ] Testes de integração (chunked flow)
- [ ] Validação em produção (beta)
- [ ] Monitoramento de métricas

---

**Autor:** AINEX Development Team  
**Revisão:** v1.0 - 30/11/2025
