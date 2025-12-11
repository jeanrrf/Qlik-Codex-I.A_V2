/**
 * Vector Search API Routes
 * Provides endpoints for semantic search and knowledge retrieval
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  findRelevantPatterns,
  getPatternsByCategory,
  searchKnowledge,
  getContextualAdvice
} from "../services/knowledgeIndexer";
import { getVectorStore } from "../services/vectorStore";
import { logger } from "../lib/logger";

const router = Router();

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1).max(5000),
  limit: z.number().int().min(1).max(50).optional().default(5),
  minSimilarity: z.number().min(0).max(1).optional().default(0.6)
});

const contextualAdviceSchema = z.object({
  scriptSnippet: z.string().min(1).max(10000),
  problemDescription: z.string().min(1).max(1000)
});

const categorySchema = z.object({
  category: z.enum([
    "joins",
    "qvd-optimization",
    "mappings",
    "sql-interaction",
    "performance",
    "data-loading",
    "data-model",
    "date-handling",
    "aggregations",
    "general"
  ]),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

/**
 * POST /api/vector/search/patterns
 * Search for relevant Qlik patterns
 */
router.post("/search/patterns", async (req: Request, res: Response) => {
  try {
    const { query, limit, minSimilarity } = searchSchema.parse(req.body);

    const patterns = await findRelevantPatterns(query, limit, minSimilarity);

    res.json({
      success: true,
      count: patterns.length,
      patterns: patterns.map(({ pattern, similarity }) => ({
        id: pattern.id,
        title: pattern.title,
        advice: pattern.advice,
        severity: pattern.severity,
        similarity: Math.round(similarity * 100) / 100
      }))
    });
  } catch (error) {
    logger.error("Pattern search failed", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Search failed"
    });
  }
});

/**
 * POST /api/vector/search/knowledge
 * Search all knowledge sources
 */
router.post("/search/knowledge", async (req: Request, res: Response) => {
  try {
    const { query, limit, minSimilarity } = searchSchema.parse(req.body);

    const results = await searchKnowledge(query, limit, minSimilarity);

    res.json({
      success: true,
      count: results.length,
      results: results.map(r => ({
        content: r.content,
        metadata: r.metadata,
        similarity: Math.round(r.similarity * 100) / 100
      }))
    });
  } catch (error) {
    logger.error("Knowledge search failed", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Search failed"
    });
  }
});

/**
 * POST /api/vector/advice
 * Get contextual advice for a script issue
 */
router.post("/advice", async (req: Request, res: Response) => {
  try {
    const { scriptSnippet, problemDescription } = contextualAdviceSchema.parse(req.body);

    const advice = await getContextualAdvice(scriptSnippet, problemDescription);

    res.json({
      success: true,
      advice
    });
  } catch (error) {
    logger.error("Contextual advice generation failed", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Advice generation failed"
    });
  }
});

/**
 * GET /api/vector/category/:category
 * Get patterns by category
 */
router.get("/category/:category", async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const validation = categorySchema.parse({ category, limit });

    const patterns = await getPatternsByCategory(validation.category, validation.limit);

    res.json({
      success: true,
      category: validation.category,
      count: patterns.length,
      patterns: patterns.map(pattern => ({
        id: pattern.id,
        title: pattern.title,
        advice: pattern.advice,
        severity: pattern.severity
      }))
    });
  } catch (error) {
    logger.error("Category search failed", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid category or limit",
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: "Category search failed"
    });
  }
});

/**
 * GET /api/vector/stats
 * Get vector store statistics
 */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const vectorStore = getVectorStore();
    const stats = vectorStore.getStats();

    res.json({
      success: true,
      stats: {
        totalDocuments: stats.totalDocuments,
        indexedDocuments: stats.indexedDocuments,
        cacheHitRate: Math.round(stats.cacheHitRate * 100) / 100,
        status: stats.indexedDocuments > 0 ? "ready" : "empty"
      }
    });
  } catch (error) {
    logger.error("Failed to get vector store stats", error);
    
    res.status(500).json({
      success: false,
      error: "Failed to get statistics"
    });
  }
});

/**
 * GET /api/vector/categories
 * List all available categories
 */
router.get("/categories", (_req: Request, res: Response) => {
  res.json({
    success: true,
    categories: [
      { id: "joins", name: "JOIN Operations", description: "JOIN alternatives and best practices" },
      { id: "qvd-optimization", name: "QVD Optimization", description: "QVD loading optimization" },
      { id: "mappings", name: "Mappings", description: "ApplyMap and MAPPING LOAD" },
      { id: "sql-interaction", name: "SQL Integration", description: "SQL integration patterns" },
      { id: "performance", name: "Performance", description: "Performance optimization" },
      { id: "data-loading", name: "Data Loading", description: "Data loading techniques" },
      { id: "data-model", name: "Data Model", description: "Data model design" },
      { id: "date-handling", name: "Date Handling", description: "Calendar and date functions" },
      { id: "aggregations", name: "Aggregations", description: "Aggregation functions" },
      { id: "general", name: "General", description: "General best practices" }
    ]
  });
});

export { router as vectorRouter };
