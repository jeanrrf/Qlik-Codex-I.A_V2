/**
 * Tests for Vector Store Service
 * Validates embedding generation, storage, and semantic search
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VectorStore, getVectorStore, resetVectorStore } from "../../src/services/vectorStore";
import { MOCK_EMBEDDING_DIMENSION, createMockEmbedding } from "../utils/mockVectorStore";

// Mock config to provide API key
vi.mock("../../src/lib/config", async () => {
  const actual = await vi.importActual("../../src/lib/config");
  return {
    ...actual,
    config: {
      ...(actual as any).config,
      geminiApiKey: "test-api-key-for-testing"
    }
  };
});

// Mock Google GenAI
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        embedContent: vi.fn().mockImplementation(async ({ contents }) => {
          const text = contents[0].parts[0].text;
          return {
            embeddings: [{
              values: createMockEmbedding(text)
            }]
          };
        })
      }
    }))
  };
});

describe("VectorStore", () => {
  let vectorStore: VectorStore;

  beforeEach(() => {
    resetVectorStore();
    vectorStore = getVectorStore();
  });

  afterEach(() => {
    vectorStore.clearAll();
  });

  describe("Document Management", () => {
    it("should add a document successfully", async () => {
      await vectorStore.addDocument({
        id: "test-doc-1",
        content: "This is a test document about Qlik optimization",
        metadata: { category: "test" }
      });

      const doc = vectorStore.getDocument("test-doc-1");
      expect(doc).not.toBeNull();
      expect(doc?.content).toBe("This is a test document about Qlik optimization");
      expect(doc?.metadata.category).toBe("test");
      expect(doc?.embedding).toBeDefined();
      expect(doc?.embedding?.length).toBe(MOCK_EMBEDDING_DIMENSION);
    });

    it("should add multiple documents in batch", async () => {
      const docs = [
        {
          id: "batch-1",
          content: "First document about Qlik performance",
          metadata: { type: "performance" }
        },
        {
          id: "batch-2",
          content: "Second document about Qlik joins",
          metadata: { type: "joins" }
        },
        {
          id: "batch-3",
          content: "Third document about QVD optimization",
          metadata: { type: "qvd" }
        }
      ];

      await vectorStore.addDocuments(docs);

      const stats = vectorStore.getStats();
      expect(stats.totalDocuments).toBe(3);
      expect(stats.indexedDocuments).toBe(3);
    });

    it("should retrieve document by id", async () => {
      await vectorStore.addDocument({
        id: "retrieve-test",
        content: "Document to retrieve",
        metadata: { test: true }
      });

      const doc = vectorStore.getDocument("retrieve-test");
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe("retrieve-test");
      expect(doc?.metadata.test).toBe(true);
    });

    it("should return null for non-existent document", () => {
      const doc = vectorStore.getDocument("non-existent");
      expect(doc).toBeNull();
    });

    it("should delete a document", async () => {
      await vectorStore.addDocument({
        id: "delete-test",
        content: "Document to delete",
        metadata: {}
      });

      expect(vectorStore.getDocument("delete-test")).not.toBeNull();

      const deleted = vectorStore.deleteDocument("delete-test");
      expect(deleted).toBe(true);
      expect(vectorStore.getDocument("delete-test")).toBeNull();
    });

    it("should return false when deleting non-existent document", () => {
      const deleted = vectorStore.deleteDocument("non-existent");
      expect(deleted).toBe(false);
    });

    it("should update document on duplicate id", async () => {
      await vectorStore.addDocument({
        id: "update-test",
        content: "Original content",
        metadata: { version: 1 }
      });

      await vectorStore.addDocument({
        id: "update-test",
        content: "Updated content",
        metadata: { version: 2 }
      });

      const doc = vectorStore.getDocument("update-test");
      expect(doc?.content).toBe("Updated content");
      expect(doc?.metadata.version).toBe(2);
    });
  });

  describe("Semantic Search", () => {
    beforeEach(async () => {
      // Add test documents
      await vectorStore.addDocuments([
        {
          id: "qlik-joins",
          content: "ApplyMap is more efficient than LEFT JOIN for simple lookups in Qlik",
          metadata: { category: "joins", severity: "info" }
        },
        {
          id: "qlik-performance",
          content: "Avoid using Peek() in loops as it creates O(n²) complexity",
          metadata: { category: "performance", severity: "warning" }
        },
        {
          id: "qlik-qvd",
          content: "QVD optimized load requires no transformations in the LOAD statement",
          metadata: { category: "qvd", severity: "info" }
        },
        {
          id: "sql-select",
          content: "Never use SELECT * in SQL loads, specify columns explicitly",
          metadata: { category: "sql", severity: "critical" }
        }
      ]);
    });

    it("should find semantically similar documents", async () => {
      const results = await vectorStore.search("How to optimize JOIN operations?", 3, 0.3);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0);
      expect(results[0].similarity).toBeLessThanOrEqual(1);
    });

    it("should return results sorted by similarity", async () => {
      const results = await vectorStore.search("QVD loading best practices", 3, 0.3);

      // Results should be sorted descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it("should respect minimum similarity threshold", async () => {
      const results = await vectorStore.search("completely unrelated topic about cooking", 10, 0.9);

      // With high threshold, should get fewer or no results
      expect(results.length).toBeLessThan(4);
    });

    it("should respect result limit", async () => {
      const results = await vectorStore.search("Qlik optimization", 2, 0.3);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array when no documents match", async () => {
      vectorStore.clearAll();
      const results = await vectorStore.search("anything", 5, 0.5);

      expect(results).toEqual([]);
    });
  });

  describe("Statistics and Cache", () => {
    it("should return correct statistics", async () => {
      await vectorStore.addDocuments([
        { id: "stat-1", content: "Doc 1", metadata: {} },
        { id: "stat-2", content: "Doc 2", metadata: {} },
        { id: "stat-3", content: "Doc 3", metadata: {} }
      ]);

      const stats = vectorStore.getStats();

      expect(stats.totalDocuments).toBe(3);
      expect(stats.indexedDocuments).toBe(3);
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it("should track cache hit rate", async () => {
      const content = "Test content for caching";

      // First call - cache miss
      await vectorStore.addDocument({
        id: "cache-test-1",
        content,
        metadata: {}
      });

      // Second call with same content - should hit cache
      await vectorStore.addDocument({
        id: "cache-test-2",
        content,
        metadata: {}
      });

      const stats = vectorStore.getStats();
      
      // Should have some cache hits
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it("should clear all documents and cache", async () => {
      await vectorStore.addDocuments([
        { id: "clear-1", content: "Doc 1", metadata: {} },
        { id: "clear-2", content: "Doc 2", metadata: {} }
      ]);

      vectorStore.clearAll();

      const stats = vectorStore.getStats();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.indexedDocuments).toBe(0);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = getVectorStore();
      const instance2 = getVectorStore();

      expect(instance1).toBe(instance2);
    });

    it("should reset instance correctly", () => {
      const instance1 = getVectorStore();
      resetVectorStore();
      const instance2 = getVectorStore();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Cosine Similarity", () => {
    it("should calculate correct similarity for identical vectors", async () => {
      const content = "Identical content for both documents";

      await vectorStore.addDocuments([
        { id: "sim-1", content, metadata: {} },
        { id: "sim-2", content, metadata: {} }
      ]);

      const results = await vectorStore.search(content, 2, 0.0);

      // Both documents should have very high similarity (close to 1.0)
      expect(results[0].similarity).toBeGreaterThan(0.95);
      if (results.length > 1) {
        expect(results[1].similarity).toBeGreaterThan(0.95);
      }
    });

    it("should handle edge cases in similarity calculation", async () => {
      await vectorStore.addDocuments([
        { id: "edge-1", content: "Very short", metadata: {} },
        { id: "edge-2", content: "A much longer document with many more words and details about various topics", metadata: {} }
      ]);

      // Should not throw errors
      const results = await vectorStore.search("medium length query", 2, 0.0);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
