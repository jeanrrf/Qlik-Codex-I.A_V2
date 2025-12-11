/**
 * Vector Store Service - Semantic Search for Qlik Knowledge Base
 * 
 * Provides vector embeddings and semantic search capabilities for:
 * - Qlik best practices and anti-patterns
 * - Script optimization knowledge
 * - Context-aware recommendations
 * 
 * Architecture:
 * - Embeddings: Google Gemini text-embedding-004
 * - Storage: SQLite with JSON vector columns
 * - Retrieval: Cosine similarity search
 * - Cache: In-memory LRU cache for frequent queries
 */

import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import { logger } from "../lib/logger";
import { config } from "../lib/config";
import { initSqliteDb } from "../lib/sqliteDb";

// Types
export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: string;
}

export interface SearchResult {
  document: VectorDocument;
  similarity: number;
}

export interface VectorStoreStats {
  totalDocuments: number;
  indexedDocuments: number;
  cacheHitRate: number;
  avgEmbeddingTime: number;
}

// Configuration
const EMBEDDING_MODEL = "text-embedding-004";
const EMBEDDING_DIMENSION = 768;
const CACHE_SIZE = 100;
const BATCH_SIZE = 10;

// Simple LRU Cache implementation
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move to end (most recent)
    const value = this.cache.get(key);
    if (value === undefined) return undefined;
    
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Vector Store Service
 */
export class VectorStore {
  private db: Database.Database;
  private genAI: GoogleGenAI | null = null;
  private embeddingCache: LRUCache<string, number[]>;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.db = initSqliteDb();
    this.embeddingCache = new LRUCache(CACHE_SIZE);
    
    if (config.geminiApiKey) {
      this.genAI = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }

    this.initializeSchema();
  }

  /**
   * Initialize database schema for vector storage
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vector_documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        embedding TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vector_docs_created 
        ON vector_documents(created_at);
    `);

    logger.info("Vector store schema initialized");
  }

  /**
   * Generate embedding for text using Google Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) {
      throw new Error("Gemini API not configured for embeddings");
    }

    // Check cache first
    const cached = this.embeddingCache.get(text);
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;

    try {
      const startTime = Date.now();

      const result = await this.genAI.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [{
          role: "user",
          parts: [{ text }]
        }]
      });

      const embedding = result.embeddings?.[0]?.values || [];
      
      if (embedding.length !== EMBEDDING_DIMENSION) {
        logger.warn(`Unexpected embedding dimension: ${embedding.length}`);
      }

      // Cache the result
      this.embeddingCache.set(text, embedding);

      const duration = Date.now() - startTime;
      logger.debug(`Generated embedding in ${duration}ms (dimension: ${embedding.length})`);

      return embedding;
    } catch (error) {
      logger.error("Failed to generate embedding", error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Add a document to the vector store
   */
  async addDocument(doc: Omit<VectorDocument, 'createdAt'>): Promise<void> {
    const embedding = await this.generateEmbedding(doc.content);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vector_documents (id, content, metadata, embedding, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      doc.id,
      doc.content,
      JSON.stringify(doc.metadata),
      JSON.stringify(embedding),
      now,
      now
    );

    logger.info(`Document added to vector store: ${doc.id}`);
  }

  /**
   * Add multiple documents in batch
   */
  async addDocuments(docs: Omit<VectorDocument, 'createdAt'>[]): Promise<void> {
    logger.info(`Adding ${docs.length} documents in batches of ${BATCH_SIZE}`);

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      await Promise.all(
        batch.map(doc => this.addDocument(doc))
      );

      logger.debug(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)}`);
    }

    logger.info(`Successfully added ${docs.length} documents`);
  }

  /**
   * Search for similar documents using semantic search
   */
  async search(query: string, limit = 5, minSimilarity = 0.5): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    // Get all documents with embeddings
    const stmt = this.db.prepare(`
      SELECT id, content, metadata, embedding, created_at
      FROM vector_documents
      WHERE embedding IS NOT NULL
    `);

    const rows = stmt.all() as any[];
    const results: SearchResult[] = [];

    for (const row of rows) {
      const embedding = JSON.parse(row.embedding) as number[];
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= minSimilarity) {
        results.push({
          document: {
            id: row.id,
            content: row.content,
            metadata: JSON.parse(row.metadata),
            embedding,
            createdAt: row.created_at
          },
          similarity
        });
      }
    }

    // Sort by similarity (highest first) and limit
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Get a document by ID
   */
  getDocument(id: string): VectorDocument | null {
    const stmt = this.db.prepare(`
      SELECT id, content, metadata, embedding, created_at
      FROM vector_documents
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      createdAt: row.created_at
    };
  }

  /**
   * Delete a document
   */
  deleteDocument(id: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM vector_documents WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Clear all documents
   */
  clearAll(): void {
    this.db.exec(`DELETE FROM vector_documents`);
    this.embeddingCache.clear();
    logger.info("Vector store cleared");
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): VectorStoreStats {
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM vector_documents
    `);

    const indexedStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM vector_documents WHERE embedding IS NOT NULL
    `);

    const total = (totalStmt.get() as any).count;
    const indexed = (indexedStmt.get() as any).count;
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      totalDocuments: total,
      indexedDocuments: indexed,
      cacheHitRate,
      avgEmbeddingTime: 0 // Future enhancement: track average embedding generation time
    };
  }

  /**
   * Rebuild embeddings for all documents (useful after model changes)
   */
  async rebuildEmbeddings(): Promise<void> {
    const stmt = this.db.prepare(`
      SELECT id, content FROM vector_documents
    `);

    const rows = stmt.all() as any[];
    logger.info(`Rebuilding embeddings for ${rows.length} documents`);

    for (const row of rows) {
      try {
        const embedding = await this.generateEmbedding(row.content);
        
        const updateStmt = this.db.prepare(`
          UPDATE vector_documents 
          SET embedding = ?, updated_at = ?
          WHERE id = ?
        `);

        updateStmt.run(
          JSON.stringify(embedding),
          new Date().toISOString(),
          row.id
        );
      } catch (error) {
        logger.error(`Failed to rebuild embedding for document ${row.id}`, error);
      }
    }

    logger.info("Embedding rebuild complete");
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

/**
 * Get or create vector store instance
 */
export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}

/**
 * Reset vector store (for testing)
 */
export function resetVectorStore(): void {
  vectorStoreInstance = null;
}
