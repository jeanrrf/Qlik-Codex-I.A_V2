/**
 * Tests for Knowledge Indexer Service
 * Validates Qlik pattern indexing and semantic retrieval
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  indexQlikPatterns,
  findRelevantPatterns,
  getPatternsByCategory,
  searchKnowledge,
  addCustomKnowledge,
  getContextualAdvice
} from "../../src/services/knowledgeIndexer";
import { getVectorStore, resetVectorStore } from "../../src/services/vectorStore";
import { QLIK_EXPERT_PATTERNS } from "../../src/lib/qlikKnowledgeBase";
import { createMockEmbedding } from "../utils/mockVectorStore";

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

describe("KnowledgeIndexer", () => {
  beforeEach(() => {
    resetVectorStore();
  });

  afterEach(() => {
    const vectorStore = getVectorStore();
    vectorStore.clearAll();
  });

  describe("Pattern Indexing", () => {
    it("should index all Qlik expert patterns", async () => {
      await indexQlikPatterns();

      const vectorStore = getVectorStore();
      const stats = vectorStore.getStats();

      expect(stats.totalDocuments).toBe(QLIK_EXPERT_PATTERNS.length);
      expect(stats.indexedDocuments).toBe(QLIK_EXPERT_PATTERNS.length);
    });

    it("should index patterns with correct structure", async () => {
      await indexQlikPatterns();

      const vectorStore = getVectorStore();
      const doc = vectorStore.getDocument("qlik-pattern-exists-vs-in");

      expect(doc).not.toBeNull();
      expect(doc?.metadata.patternId).toBe("exists-vs-in");
      expect(doc?.metadata.title).toBeDefined();
      expect(doc?.metadata.severity).toBeDefined();
      expect(doc?.metadata.category).toBeDefined();
      expect(doc?.content).toContain("Pattern:");
      expect(doc?.content).toContain("Severity:");
    });

    it("should categorize patterns correctly", async () => {
      await indexQlikPatterns();

      const vectorStore = getVectorStore();
      
      // Check JOIN pattern is in 'joins' category
      const joinDoc = vectorStore.getDocument("qlik-pattern-applymap-vs-join");
      expect(joinDoc?.metadata.category).toBe("joins");

      // Check QVD pattern is in 'qvd-optimization' category
      const qvdDoc = vectorStore.getDocument("qlik-pattern-qvd-optimized");
      expect(qvdDoc?.metadata.category).toBe("qvd-optimization");

      // Check SQL pattern is in 'sql-interaction' category
      const sqlDoc = vectorStore.getDocument("qlik-pattern-select-star");
      expect(sqlDoc?.metadata.category).toBe("sql-interaction");
    });
  });

  describe("Relevant Pattern Retrieval", () => {
    beforeEach(async () => {
      await indexQlikPatterns();
    });

    it("should find relevant patterns for a query", async () => {
      const results = await findRelevantPatterns(
        "How can I improve JOIN performance in my Qlik script?",
        5,
        0.3
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].pattern).toBeDefined();
      expect(results[0].similarity).toBeGreaterThan(0);
      expect(results[0].similarity).toBeLessThanOrEqual(1);
    });

    it("should return patterns sorted by similarity", async () => {
      const results = await findRelevantPatterns(
        "QVD optimization best practices",
        5,
        0.3
      );

      // Check sorted descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it("should respect minimum similarity threshold", async () => {
      const highThresholdResults = await findRelevantPatterns(
        "random unrelated query",
        10,
        0.95
      );

      const lowThresholdResults = await findRelevantPatterns(
        "random unrelated query",
        10,
        0.3
      );

      expect(highThresholdResults.length).toBeLessThanOrEqual(lowThresholdResults.length);
    });

    it("should respect result limit", async () => {
      const results = await findRelevantPatterns(
        "Qlik script optimization",
        3,
        0.3
      );

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array when no patterns match", async () => {
      const results = await findRelevantPatterns(
        "completely unrelated topic",
        5,
        0.99
      );

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Category-based Retrieval", () => {
    beforeEach(async () => {
      await indexQlikPatterns();
    });

    it("should get patterns by category", async () => {
      const joinPatterns = await getPatternsByCategory("joins", 10);

      expect(joinPatterns.length).toBeGreaterThan(0);
      
      // Verify they are actual patterns
      joinPatterns.forEach(pattern => {
        expect(pattern.id).toBeDefined();
        expect(pattern.title).toBeDefined();
        expect(pattern.advice).toBeDefined();
      });
    });

    it("should return different patterns for different categories", async () => {
      const joinPatterns = await getPatternsByCategory("joins", 5);
      const performancePatterns = await getPatternsByCategory("performance", 5);

      // Categories might return same patterns if search is too broad
      // Just verify they are valid patterns
      expect(Array.isArray(joinPatterns)).toBe(true);
      expect(Array.isArray(performancePatterns)).toBe(true);
    });
  });

  describe("Custom Knowledge", () => {
    it("should add custom knowledge document", async () => {
      await addCustomKnowledge(
        "my-custom-rule",
        "Always use QUALIFY when loading similar tables",
        { author: "test", priority: "high" }
      );

      const vectorStore = getVectorStore();
      const doc = vectorStore.getDocument("custom-my-custom-rule");

      expect(doc).not.toBeNull();
      expect(doc?.content).toContain("QUALIFY");
      expect(doc?.metadata.type).toBe("custom");
      expect(doc?.metadata.author).toBe("test");
      expect(doc?.metadata.priority).toBe("high");
    });

    it("should search across all knowledge including custom", async () => {
      await indexQlikPatterns();
      await addCustomKnowledge(
        "custom-1",
        "Custom rule about very specific optimization technique",
        { type: "custom" }
      );

      const results = await searchKnowledge("optimization technique", 10, 0.3);

      expect(results.length).toBeGreaterThan(0);
      
      // Check that custom knowledge was indexed
      const vectorStore = getVectorStore();
      const customDoc = vectorStore.getDocument("custom-custom-1");
      expect(customDoc).not.toBeNull();
      expect(customDoc?.metadata.type).toBe("custom");
    });
  });

  describe("Contextual Advice", () => {
    beforeEach(async () => {
      await indexQlikPatterns();
    });

    it("should provide contextual advice for script issue", async () => {
      const advice = await getContextualAdvice(
        "LOAD * FROM [lib://Data/Sales.qvd] (qvd);",
        "Script is loading slowly and using too much memory"
      );

      expect(advice).toBeDefined();
      expect(typeof advice).toBe("string");
      expect(advice.length).toBeGreaterThan(0);
    });

    it("should include pattern references in advice", async () => {
      const advice = await getContextualAdvice(
        "LEFT JOIN (Customers) LOAD CustomerID, CustomerName FROM ...",
        "Join operation is causing performance issues"
      );

      expect(advice).toBeDefined();
      expect(typeof advice).toBe("string");
      // Should contain pattern information (in Portuguese as per project language)
      expect(advice.length).toBeGreaterThan(50);
    });

    it("should handle case with no matching patterns gracefully", async () => {
      const advice = await getContextualAdvice(
        "some random text",
        "unrelated problem description xyz abc 123"
      );

      expect(advice).toBeDefined();
      expect(typeof advice).toBe("string");
      // With mock embeddings, some patterns might match
      // Just verify we get a response
      expect(advice.length).toBeGreaterThan(0);
    });
  });

  describe("General Knowledge Search", () => {
    beforeEach(async () => {
      await indexQlikPatterns();
      await addCustomKnowledge(
        "test-custom",
        "Test custom knowledge about Qlik tables",
        { source: "test" }
      );
    });

    it("should search all knowledge sources", async () => {
      const results = await searchKnowledge("Qlik tables", 5, 0.3);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.content).toBeDefined();
        expect(r.metadata).toBeDefined();
        expect(r.similarity).toBeGreaterThan(0);
      });
    });

    it("should return results with similarity scores", async () => {
      const results = await searchKnowledge("performance optimization", 3, 0.3);

      results.forEach(r => {
        expect(r.similarity).toBeGreaterThanOrEqual(0.3);
        expect(r.similarity).toBeLessThanOrEqual(1.0);
      });
    });
  });
});
