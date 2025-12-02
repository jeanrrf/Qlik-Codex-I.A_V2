# Guia de Integração - Visualização de Progresso em Tempo Real

## 📦 Componentes Criados

### 1. **ScriptAnalysisInfo** - Exibe características do script
```tsx
import ScriptAnalysisInfo from '../components/ScriptAnalysisInfo';

<ScriptAnalysisInfo analysis={scriptAnalysis} />
```

**Props:**
- `analysis`: Dados da análise do script (fileType, size, complexity, tokens, QVD operations, strategy)

### 2. **ChunkingProgress** - Mostra progresso de chunking em tempo real
```tsx
import ChunkingProgress from '../components/ChunkingProgress';

<ChunkingProgress 
  chunkingInfo={chunkingInfo}
  currentProgress={currentChunkProgress}
  isActive={isProcessing}
/>
```

**Props:**
- `chunkingInfo`: Configuração do chunking (totalChunks, chunkSize, overlap, focusAreas)
- `currentProgress`: Progresso atual (currentChunk, percentage, context, lines)
- `isActive`: Se está processando ativamente

### 3. **useOptimizationProgress** - Hook para SSE
```tsx
import { useOptimizationProgress } from '../hooks/useOptimizationProgress';

const {
  isConnected,
  scriptAnalysis,
  chunkingInfo,
  currentChunkProgress,
  currentStep,
  error,
  connect,
  disconnect,
  reset
} = useOptimizationProgress();
```

## 🔌 Como Integrar no OptimizerPageV2

### Passo 1: Adicionar imports
```tsx
import ScriptAnalysisInfo from "../components/ScriptAnalysisInfo";
import ChunkingProgress from "../components/ChunkingProgress";
import { useOptimizationProgress } from "../hooks/useOptimizationProgress";
```

### Passo 2: Inicializar hook
```tsx
const OptimizerPage: React.FC<OptimizerPageProps> = ({ onBackToLanding }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Hook de progresso
  const {
    isConnected,
    scriptAnalysis,
    chunkingInfo,
    currentChunkProgress,
    connect,
    disconnect,
    reset
  } = useOptimizationProgress();
  
  // ... resto do código
```

### Passo 3: Conectar ao iniciar otimização
```tsx
const handleOptimize = async () => {
  setIsOptimizing(true);
  reset(); // Limpa estado anterior
  connect(); // Conecta SSE
  
  try {
    const result = await apiClient.optimizeScript({
      script: editorContent,
      mode: selectedMode,
      // ... outras opções
    });
    
    setOptimizationResult(result);
  } catch (error) {
    console.error('Optimization error:', error);
  } finally {
    setIsOptimizing(false);
    disconnect(); // Desconecta SSE
  }
};
```

### Passo 4: Adicionar componentes no JSX
```tsx
return (
  <div className="optimizer-page">
    {/* ... cabeçalho e inputs ... */}
    
    {/* Exibe análise do script quando detectada */}
    {scriptAnalysis && (
      <ScriptAnalysisInfo analysis={scriptAnalysis} />
    )}
    
    {/* Exibe progresso de chunking quando ativo */}
    {chunkingInfo && (
      <ChunkingProgress 
        chunkingInfo={chunkingInfo}
        currentProgress={currentChunkProgress}
        isActive={isOptimizing}
      />
    )}
    
    {/* Indicador de conexão SSE */}
    {isConnected && (
      <div className="sse-status connected">
        🟢 Recebendo atualizações em tempo real
      </div>
    )}
    
    {/* ... resto da interface ... */}
  </div>
);
```

## 📡 Eventos SSE Emitidos pelo Backend

### 1. `script_analysis` - Características detectadas
```json
{
  "type": "script_analysis",
  "data": {
    "fileType": "qvd",
    "size": "large",
    "complexity": "high",
    "lines": 1245,
    "estimatedTokens": 52340,
    "qvdOperations": { "reads": 34, "writes": 12 },
    "strategy": "chunked"
  }
}
```

### 2. `chunking_started` - Início do chunking
```json
{
  "type": "chunking_started",
  "data": {
    "totalChunks": 5,
    "chunkSize": 300,
    "overlapLines": 45,
    "focusAreas": ["QVD operations", "Complex joins"]
  }
}
```

### 3. `chunk_progress` - Progresso de cada chunk
```json
{
  "type": "chunk_progress",
  "data": {
    "currentChunk": 2,
    "totalChunks": 5,
    "percentage": 40,
    "chunkContext": "Chunk 2: QVD Read, Joins",
    "startLine": 256,
    "endLine": 555
  }
}
```

## 🎨 Customização de Estilos

Os componentes usam CSS modules. Para customizar:

1. **ScriptAnalysisInfo.css** - Cards de análise
2. **ChunkingProgress.css** - Barra de progresso e indicadores

Variáveis principais:
```css
/* Cores dos estados */
--color-qvd: #ff6600;
--color-qvs: #00ccff;
--color-low: #00ff88;
--color-medium: #ffaa00;
--color-high: #ff6600;
--color-critical: #ff0066;
```

## 🔥 Exemplo Completo

```tsx
// OptimizerPageV2.tsx (seção de progresso)

const [showProgress, setShowProgress] = useState(false);

const {
  scriptAnalysis,
  chunkingInfo,
  currentChunkProgress,
  connect,
  disconnect,
  reset
} = useOptimizationProgress();

const handleOptimize = async () => {
  setShowProgress(true);
  reset();
  connect();
  
  try {
    const result = await apiClient.optimizeScript({...});
    setResult(result);
  } finally {
    setShowProgress(false);
    disconnect();
  }
};

return (
  <div className="optimizer-container">
    {showProgress && (
      <div className="progress-section">
        {scriptAnalysis && (
          <ScriptAnalysisInfo analysis={scriptAnalysis} />
        )}
        
        {chunkingInfo && (
          <ChunkingProgress 
            chunkingInfo={chunkingInfo}
            currentProgress={currentChunkProgress}
            isActive={showProgress}
          />
        )}
      </div>
    )}
    
    {/* Resto da interface */}
  </div>
);
```

## ✅ Checklist de Integração

- [x] Componentes criados
- [x] Hook de progresso implementado
- [x] Backend emitindo eventos SSE
- [ ] Integrar no OptimizerPageV2.tsx
- [ ] Testar com arquivo grande QVD/QVS
- [ ] Ajustar posicionamento na UI
- [ ] Adicionar animações de transição

## 🚀 Próximos Passos

1. Importar componentes no OptimizerPageV2
2. Adicionar hook useOptimizationProgress
3. Conectar/desconectar SSE no ciclo de otimização
4. Posicionar componentes visualmente
5. Testar com script QVD real

---

**A interface agora mostra em tempo real**:
- ✅ Tipo e características do arquivo
- ✅ Estratégia selecionada (full/optimized/chunked)
- ✅ Progresso de chunks (chunk atual, percentual, linhas)
- ✅ Áreas de foco da análise
- ✅ Operações QVD detectadas
