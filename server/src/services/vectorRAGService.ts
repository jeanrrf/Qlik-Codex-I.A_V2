import { createHash } from 'crypto';

import { v4 as uuidv4 } from 'uuid';

import { config } from '../lib/config';
import { googleProvider } from '../lib/llmProviders/googleProvider';
import { logger } from '../lib/logger';
import { getTursoDb } from '../lib/tursoDb';
import type {
  RAGConfig,
  OptimizationVectorMetadata,
  RAGContext,
  RAGSearchResult,
  RAGStats,
  FeedbackType
} from '../types/rag';

/**
 * VectorRAGService
 * Sistema de RAG focado em aprendizado por reforço de otimizações
 * 
 * Arquitetura:
 * 1. Armazena histórico de otimizações bem-sucedidas
 * 2. Usa embeddings (Google text-embedding-004) para busca semântica
 * 3. Sistema de recompensa: approve = +10 score, reject = descarta
 * 4. Injeta contexto RAG no prompt para melhorar futuras otimizações
 */
class VectorRAGService {
  private ragConfig: RAGConfig;
  private initialized = false;

  constructor() {
    this.ragConfig = {
      enabled: process.env.RAG_ENABLED === 'true',
      maxExamples: parseInt(process.env.RAG_MAX_EXAMPLES || '3', 10),
      similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'),
      minRewardScore: parseInt(process.env.RAG_MIN_REWARD_SCORE || '5', 10),
      searchTimeoutMs: parseInt(process.env.RAG_SEARCH_TIMEOUT_MS || '200', 10),
      embeddingModel: 'text-embedding-004',
      embeddingDimensions: 768
    };
  }

  /**
   * Inicializa tabelas no Turso DB
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('[RAG] Initializing vector tables in Turso DB');

      const db = getTursoDb();
      // Tabela principal de otimizações com embeddings
      await db.execute(`
        CREATE TABLE IF NOT EXISTS optimization_vectors (
          id TEXT PRIMARY KEY,
          optimization_id TEXT UNIQUE NOT NULL,
          script_hash TEXT NOT NULL,
          created_at TEXT NOT NULL,
          mode TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending_feedback',
          reward_score INTEGER NOT NULL DEFAULT 0,
          script_lines INTEGER NOT NULL,
          complexity TEXT NOT NULL,
          breaking_risk TEXT NOT NULL,
          optimization_tags TEXT, -- JSON array
          user_id TEXT,
          embedding BLOB NOT NULL, -- Embedding vetorial (768D)
          original_snippet TEXT NOT NULL,
          optimized_snippet TEXT NOT NULL,
          changes_summary TEXT NOT NULL,
          patterns TEXT, -- JSON array
          updated_at TEXT NOT NULL
        )
      `);

      // Índices para performance
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_opt_vec_hash 
        ON optimization_vectors(script_hash)
      `);

      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_opt_vec_status 
        ON optimization_vectors(status)
      `);

      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_opt_vec_reward 
        ON optimization_vectors(reward_score DESC)
      `);

      // Tabela de feedback do usuário
      await db.execute(`
        CREATE TABLE IF NOT EXISTS optimization_feedback (
          id TEXT PRIMARY KEY,
          optimization_id TEXT NOT NULL,
          user_id TEXT,
          feedback_type TEXT NOT NULL, -- 'approve' or 'reject'
          comment TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY(optimization_id) REFERENCES optimization_vectors(optimization_id)
        )
      `);

      // Tabela de estatísticas agregadas (cache)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS rag_stats_cache (
          id INTEGER PRIMARY KEY DEFAULT 1,
          total_documents INTEGER DEFAULT 0,
          approved_documents INTEGER DEFAULT 0,
          rejected_documents INTEGER DEFAULT 0,
          pending_documents INTEGER DEFAULT 0,
          avg_reward_score REAL DEFAULT 0,
          avg_search_latency_ms REAL DEFAULT 0,
          cache_hit_rate REAL DEFAULT 0,
          last_updated TEXT NOT NULL
        )
      `);

      this.initialized = true;
      logger.info('[RAG] Vector tables initialized successfully');
    } catch (error) {
      logger.error('[RAG] Failed to initialize vector tables', { error });
      throw error;
    }
  }

  /**
   * Verifica se RAG está habilitado
   */
  isEnabled(): boolean {
    return this.ragConfig.enabled && config.geminiApiKey !== undefined;
  }

  /**
   * Gera embedding do script usando Google text-embedding-004
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await googleProvider.getEmbedding(text);

      if (embedding.length !== this.ragConfig.embeddingDimensions) {
        logger.warn('[RAG] Embedding dimension mismatch', {
          expected: this.ragConfig.embeddingDimensions,
          received: embedding.length
        });
      }

      return embedding;
    } catch (error) {
      logger.error('[RAG] Failed to generate embedding', { error });
      throw error;
    }
  }

  /**
   * Calcula similaridade cosseno entre dois vetores
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Indexa uma nova otimização no vector store
   */
  async indexOptimization(
    originalScript: string,
    optimizedScript: string,
    metadata: Omit<OptimizationVectorMetadata, 'optimizationId' | 'scriptHash' | 'createdAt' | 'status' | 'rewardScore'>,
    changesSummary: string,
    patterns: string[]
  ): Promise<string> {
    if (!this.isEnabled()) {
      logger.debug('[RAG] RAG disabled, skipping indexing');
      return '';
    }

    await this.initialize();

    try {
      const optimizationId = uuidv4();
      const scriptHash = createHash('sha256').update(originalScript).digest('hex');
      const createdAt = new Date().toISOString();

      // Gera embedding do script original
      const startEmbed = Date.now();
      const embedding = await this.generateEmbedding(originalScript);
      const embedTime = Date.now() - startEmbed;

      logger.info('[RAG] Generated embedding', {
        optimizationId,
        dimensions: embedding.length,
        timeMs: embedTime
      });

      // Trunca snippets para economizar espaço
      const originalSnippet = originalScript.length > 2000
        ? originalScript.substring(0, 2000) + '\n... (truncado)'
        : originalScript;

      const optimizedSnippet = optimizedScript.length > 2000
        ? optimizedScript.substring(0, 2000) + '\n... (truncado)'
        : optimizedScript;

      // Converte embedding para BLOB
      const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);

      // Insere no banco
      const db = getTursoDb();
      await db.execute({
        sql: `
          INSERT INTO optimization_vectors (
            id, optimization_id, script_hash, created_at, mode, provider, model,
            status, reward_score, script_lines, complexity, breaking_risk,
            optimization_tags, user_id, embedding, original_snippet, 
            optimized_snippet, changes_summary, patterns, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          uuidv4(), // id
          optimizationId,
          scriptHash,
          createdAt,
          metadata.mode,
          metadata.provider,
          metadata.model,
          'pending_feedback',
          0, // reward_score inicial
          metadata.scriptLines,
          metadata.complexity,
          metadata.breakingRisk,
          JSON.stringify(metadata.optimizationTags),
          metadata.userId || null,
          embeddingBlob,
          originalSnippet,
          optimizedSnippet,
          changesSummary,
          JSON.stringify(patterns),
          createdAt
        ]
      });

      logger.info('[RAG] Indexed optimization', { optimizationId, scriptHash });

      return optimizationId;
    } catch (error) {
      logger.error('[RAG] Failed to index optimization', { error });
      // Fail-open: não bloqueia a otimização se RAG falhar
      return '';
    }
  }

  /**
   * Busca otimizações similares usando busca vetorial
   */
  async searchSimilar(
    scriptToOptimize: string,
    limit?: number
  ): Promise<RAGSearchResult[]> {
    if (!this.isEnabled()) {
      logger.debug('[RAG] RAG disabled, skipping search');
      return [];
    }

    await this.initialize();

    const startTime = Date.now();

    try {
      // Gera embedding da query
      const queryEmbedding = await this.generateEmbedding(scriptToOptimize);

      const db = getTursoDb();
      // Busca todos os documentos aprovados ou com bom score
      const result = await db.execute({
        sql: `
          SELECT 
            id, optimization_id, script_hash, created_at, mode, provider, model,
            status, reward_score, script_lines, complexity, breaking_risk,
            optimization_tags, user_id, embedding, original_snippet,
            optimized_snippet, changes_summary, patterns
          FROM optimization_vectors
          WHERE status = 'approved' OR reward_score >= ?
          ORDER BY reward_score DESC
          LIMIT 100
        `,
        args: [this.ragConfig.minRewardScore]
      });

      const candidates: RAGSearchResult[] = [];

      // Calcula similaridade para cada candidato
      for (const row of result.rows) {
        const embeddingBlob = row.embedding as ArrayBuffer;
        const embeddingArray = Array.from(new Float32Array(embeddingBlob));

        const similarity = this.cosineSimilarity(queryEmbedding, embeddingArray);

        if (similarity >= this.ragConfig.similarityThreshold) {
          candidates.push({
            document: {
              id: row.id as string,
              embedding: embeddingArray,
              metadata: {
                optimizationId: row.optimization_id as string,
                scriptHash: row.script_hash as string,
                createdAt: row.created_at as string,
                mode: row.mode as 'ultra-expert' | 'nvidia-fast',
                provider: row.provider as string,
                model: row.model as string,
                status: row.status as 'pending_feedback' | 'approved' | 'rejected',
                rewardScore: row.reward_score as number,
                scriptLines: row.script_lines as number,
                complexity: row.complexity as 'low' | 'medium' | 'high',
                breakingRisk: row.breaking_risk as 'none' | 'low' | 'medium' | 'high',
                optimizationTags: JSON.parse(row.optimization_tags as string || '[]'),
                userId: row.user_id as string | undefined
              },
              content: {
                originalSnippet: row.original_snippet as string,
                optimizedSnippet: row.optimized_snippet as string,
                changesSummary: row.changes_summary as string,
                patterns: JSON.parse(row.patterns as string || '[]')
              }
            },
            similarity,
            rank: 0 // será preenchido depois
          });
        }
      }

      // Ordena por similaridade * rewardScore (híbrido)
      candidates.sort((a, b) => {
        const scoreA = a.similarity * (1 + a.document.metadata.rewardScore / 100);
        const scoreB = b.similarity * (1 + b.document.metadata.rewardScore / 100);
        return scoreB - scoreA;
      });

      // Atribui rank
      candidates.forEach((candidate, index) => {
        candidate.rank = index + 1;
      });

      const topResults = candidates.slice(0, limit || this.ragConfig.maxExamples);

      const elapsed = Date.now() - startTime;

      logger.info('[RAG] Search completed', {
        query: scriptToOptimize.substring(0, 100),
        totalCandidates: candidates.length,
        returnedResults: topResults.length,
        latencyMs: elapsed
      });

      return topResults;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error('[RAG] Search failed', { error, latencyMs: elapsed });
      // Fail-open: retorna lista vazia em caso de erro
      return [];
    }
  }

  /**
   * Constrói contexto RAG para injetar no prompt
   */
  async buildRAGContext(scriptToOptimize: string): Promise<RAGContext | null> {
    const startTime = Date.now();

    const results = await this.searchSimilar(scriptToOptimize);

    if (results.length === 0) {
      return null;
    }

    const elapsed = Date.now() - startTime;

    const examples = results.map(r => ({
      originalSnippet: r.document.content.originalSnippet,
      optimizedSnippet: r.document.content.optimizedSnippet,
      changesSummary: r.document.content.changesSummary,
      rewardScore: r.document.metadata.rewardScore
    }));

    // Extrai padrões comuns
    const allPatterns = results.flatMap(r => r.document.content.patterns);
    const patternCounts = allPatterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonPatterns = Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;

    return {
      examples,
      commonPatterns,
      retrievalMetadata: {
        totalResults: results.length,
        avgSimilarity,
        retrievalTimeMs: elapsed
      }
    };
  }

  /**
   * Processa feedback do usuário (approve/reject)
   */
  async processFeedback(
    optimizationId: string,
    feedbackType: FeedbackType,
    userId?: string,
    comment?: string
  ): Promise<void> {
    await this.initialize();

    try {
      const db = getTursoDb();
      // Registra feedback
      await db.execute({
        sql: `
          INSERT INTO optimization_feedback (id, optimization_id, user_id, feedback_type, comment, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [uuidv4(), optimizationId, userId || null, feedbackType, comment || null, new Date().toISOString()]
      });

      if (feedbackType === 'approve') {
        // Incrementa reward score
        await db.execute({
          sql: `
            UPDATE optimization_vectors
            SET reward_score = reward_score + 10,
                status = 'approved',
                updated_at = ?
            WHERE optimization_id = ?
          `,
          args: [new Date().toISOString(), optimizationId]
        });

        logger.info('[RAG] Optimization approved', { optimizationId, newScore: '+10' });
      } else {
        // Marca como rejeitado e zera score
        await db.execute({
          sql: `
            UPDATE optimization_vectors
            SET reward_score = 0,
                status = 'rejected',
                updated_at = ?
            WHERE optimization_id = ?
          `,
          args: [new Date().toISOString(), optimizationId]
        });

        logger.info('[RAG] Optimization rejected', { optimizationId });
      }
    } catch (error) {
      logger.error('[RAG] Failed to process feedback', { error, optimizationId });
      throw error;
    }
  }

  /**
   * Retorna estatísticas do sistema RAG
   */
  async getStats(): Promise<RAGStats> {
    await this.initialize();

    try {
      const db = getTursoDb();
      const result = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN status = 'pending_feedback' THEN 1 ELSE 0 END) as pending,
          AVG(reward_score) as avg_score
        FROM optimization_vectors
      `);

      const row = result.rows[0];

      return {
        totalDocuments: row.total as number,
        approvedDocuments: row.approved as number,
        rejectedDocuments: row.rejected as number,
        pendingDocuments: row.pending as number,
        avgRewardScore: row.avg_score as number || 0,
        avgSearchLatencyMs: 0, // TODO: calcular com métricas reais
        cacheHitRate: 0 // TODO: implementar cache
      };
    } catch (error) {
      logger.error('[RAG] Failed to get stats', { error });
      throw error;
    }
  }

  /**
   * Limpa documentos rejeitados antigos (garbage collection)
   */
  async cleanupRejected(olderThanDays = 30): Promise<number> {
    await this.initialize();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const db = getTursoDb();
      const result = await db.execute({
        sql: `
          DELETE FROM optimization_vectors
          WHERE status = 'rejected' AND updated_at < ?
        `,
        args: [cutoffDate.toISOString()]
      });

      logger.info('[RAG] Cleaned up rejected optimizations', { deleted: result.rowsAffected });

      return result.rowsAffected;
    } catch (error) {
      logger.error('[RAG] Failed to cleanup rejected', { error });
      throw error;
    }
  }
}

export const vectorRAGService = new VectorRAGService();
