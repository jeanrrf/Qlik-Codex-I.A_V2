/**
 * RAG (Retrieval-Augmented Generation) Types
 * Sistema de aprendizado por reforço baseado em feedback do usuário
 */

export type FeedbackType = 'approve' | 'reject';
export type OptimizationStatus = 'pending_feedback' | 'approved' | 'rejected' | 'archived';

/**
 * Metadados de um documento de otimização no vector store
 */
export interface OptimizationVectorMetadata {
  /** ID único da otimização */
  optimizationId: string;
  /** Hash do script original (para deduplicação) */
  scriptHash: string;
  /** Timestamp de criação */
  createdAt: string;
  /** Modo de otimização usado */
  mode: 'ultra-expert' | 'nvidia-fast';
  /** Provider LLM que gerou */
  provider: string;
  /** Modelo LLM usado */
  model: string;
  /** Status do feedback do usuário */
  status: OptimizationStatus;
  /** Score de recompensa (incrementa com approves, decrementa com rejects) */
  rewardScore: number;
  /** Número de linhas do script original */
  scriptLines: number;
  /** Complexidade estimada (low/medium/high) */
  complexity: 'low' | 'medium' | 'high';
  /** Breaking risk */
  breakingRisk: 'none' | 'low' | 'medium' | 'high';
  /** Principais otimizações aplicadas (tags) */
  optimizationTags: string[];
  /** User ID que solicitou (se autenticado) */
  userId?: string;
}

/**
 * Documento armazenado no vector store
 */
export interface OptimizationVectorDocument {
  /** ID do documento */
  id: string;
  /** Embedding do script original (768D para text-embedding-004) */
  embedding: number[];
  /** Metadados estruturados */
  metadata: OptimizationVectorMetadata;
  /** Conteúdo textual para recuperação (resumo da otimização) */
  content: {
    /** Script original (truncado se >2000 chars) */
    originalSnippet: string;
    /** Script otimizado (truncado se >2000 chars) */
    optimizedSnippet: string;
    /** Resumo das mudanças aplicadas */
    changesSummary: string;
    /** Padrões identificados (para matching) */
    patterns: string[];
  };
}

/**
 * Resultado de busca RAG
 */
export interface RAGSearchResult {
  /** Documento recuperado */
  document: OptimizationVectorDocument;
  /** Score de similaridade (0-1) */
  similarity: number;
  /** Rank na lista de resultados */
  rank: number;
}

/**
 * Contexto RAG injetado no prompt
 */
export interface RAGContext {
  /** Exemplos de otimizações similares bem-sucedidas */
  examples: Array<{
    originalSnippet: string;
    optimizedSnippet: string;
    changesSummary: string;
    rewardScore: number;
  }>;
  /** Padrões comuns identificados */
  commonPatterns: string[];
  /** Metadados de recuperação */
  retrievalMetadata: {
    totalResults: number;
    avgSimilarity: number;
    retrievalTimeMs: number;
  };
}

/**
 * Configuração do sistema RAG
 */
export interface RAGConfig {
  /** Habilitar RAG */
  enabled: boolean;
  /** Número máximo de exemplos a recuperar */
  maxExamples: number;
  /** Threshold mínimo de similaridade (0-1) */
  similarityThreshold: number;
  /** Score mínimo de recompensa para incluir exemplo */
  minRewardScore: number;
  /** Timeout para busca vetorial (ms) */
  searchTimeoutMs: number;
  /** Embedding model */
  embeddingModel: string;
  /** Dimensões do embedding */
  embeddingDimensions: number;
}

/**
 * Request de feedback do usuário
 */
export interface UserFeedbackRequest {
  /** ID da otimização */
  optimizationId: string;
  /** Tipo de feedback */
  feedbackType: FeedbackType;
  /** Comentário opcional */
  comment?: string;
}

/**
 * Estatísticas do sistema RAG
 */
export interface RAGStats {
  /** Total de documentos indexados */
  totalDocuments: number;
  /** Documentos aprovados */
  approvedDocuments: number;
  /** Documentos rejeitados */
  rejectedDocuments: number;
  /** Documentos pendentes de feedback */
  pendingDocuments: number;
  /** Score médio de recompensa */
  avgRewardScore: number;
  /** Latência média de busca (ms) */
  avgSearchLatencyMs: number;
  /** Taxa de hit em cache */
  cacheHitRate: number;
}
