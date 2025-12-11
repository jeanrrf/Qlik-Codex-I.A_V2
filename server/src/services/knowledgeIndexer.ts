/**
 * Knowledge Base Indexer - Indexes Qlik patterns into vector store
 * 
 * Responsibilities:
 * - Convert Qlik expert patterns into searchable vector documents
 * - Maintain synchronized index of best practices
 * - Provide semantic retrieval for agent prompts
 */

import { getVectorStore, VectorDocument } from "./vectorStore";
import { QLIK_EXPERT_PATTERNS, QlikPattern } from "../lib/qlikKnowledgeBase";
import { logger } from "../lib/logger";

export interface IndexedPattern extends Omit<VectorDocument, 'createdAt'> {
  metadata: {
    patternId: string;
    title: string;
    severity: string;
    trigger: string;
    category: string;
  };
}

/**
 * Convert Qlik pattern to indexable document
 */
function patternToDocument(pattern: QlikPattern): IndexedPattern {
  // Create rich content for better semantic matching
  const content = `
Pattern: ${pattern.title}
ID: ${pattern.id}
Severity: ${pattern.severity}

Description and Best Practice:
${pattern.advice}

Category: ${categorizePattern(pattern)}
  `.trim();

  return {
    id: `qlik-pattern-${pattern.id}`,
    content,
    metadata: {
      patternId: pattern.id,
      title: pattern.title,
      severity: pattern.severity,
      trigger: pattern.trigger.source,
      category: categorizePattern(pattern)
    }
  };
}

/**
 * Categorize pattern for better organization
 */
function categorizePattern(pattern: QlikPattern): string {
  const id = pattern.id.toLowerCase();
  const title = pattern.title.toLowerCase();

  if (id.includes('join') || title.includes('join')) return 'joins';
  if (id.includes('qvd') || title.includes('qvd')) return 'qvd-optimization';
  if (id.includes('map') || id.includes('apply')) return 'mappings';
  if (id.includes('sql') || title.includes('sql')) return 'sql-interaction';
  if (id.includes('performance') || id.includes('loop') || id.includes('peek')) return 'performance';
  if (id.includes('load') || id.includes('concatenate')) return 'data-loading';
  if (id.includes('key') || id.includes('synthetic')) return 'data-model';
  if (id.includes('date') || id.includes('calendar')) return 'date-handling';
  if (id.includes('aggregate') || id.includes('count')) return 'aggregations';
  
  return 'general';
}

/**
 * Index all Qlik expert patterns into vector store
 */
export async function indexQlikPatterns(): Promise<void> {
  const vectorStore = getVectorStore();
  
  logger.info(`Indexing ${QLIK_EXPERT_PATTERNS.length} Qlik expert patterns`);

  const documents = QLIK_EXPERT_PATTERNS.map(patternToDocument);
  
  try {
    await vectorStore.addDocuments(documents);
    
    const stats = vectorStore.getStats();
    logger.info("Qlik patterns indexed successfully", {
      totalDocuments: stats.totalDocuments,
      indexedDocuments: stats.indexedDocuments
    });
  } catch (error) {
    logger.error("Failed to index Qlik patterns", error);
    throw error;
  }
}

/**
 * Find relevant patterns for a given script or query
 */
export async function findRelevantPatterns(
  query: string,
  limit = 5,
  minSimilarity = 0.6
): Promise<Array<{ pattern: QlikPattern; similarity: number }>> {
  const vectorStore = getVectorStore();

  try {
    const results = await vectorStore.search(query, limit, minSimilarity);

    return results
      .filter(r => r.document.metadata.patternId)
      .map(r => {
        const pattern = QLIK_EXPERT_PATTERNS.find(
          p => p.id === r.document.metadata.patternId
        );

        if (!pattern) return null;

        return {
          pattern,
          similarity: r.similarity
        };
      })
      .filter((item): item is { pattern: QlikPattern; similarity: number } => item !== null);
  } catch (error) {
    logger.error("Failed to find relevant patterns", error);
    return [];
  }
}

/**
 * Get patterns by category
 */
export async function getPatternsByCategory(
  category: string,
  limit = 10
): Promise<QlikPattern[]> {
  const vectorStore = getVectorStore();

  // Search with category-specific query
  const query = `Qlik ${category} best practices and anti-patterns`;
  
  try {
    const results = await vectorStore.search(query, limit, 0.5);

    return results
      .filter(r => r.document.metadata.category === category)
      .map(r => {
        const pattern = QLIK_EXPERT_PATTERNS.find(
          p => p.id === r.document.metadata.patternId
        );
        return pattern;
      })
      .filter((p): p is QlikPattern => p !== undefined);
  } catch (error) {
    logger.error(`Failed to get patterns for category: ${category}`, error);
    return [];
  }
}

/**
 * Add custom knowledge document to vector store
 */
export async function addCustomKnowledge(
  id: string,
  content: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const vectorStore = getVectorStore();

  const document: Omit<VectorDocument, 'createdAt'> = {
    id: `custom-${id}`,
    content,
    metadata: {
      ...metadata,
      type: 'custom',
      source: 'user-defined'
    }
  };

  await vectorStore.addDocument(document);
  logger.info(`Custom knowledge added: ${id}`);
}

/**
 * Search all knowledge (patterns + custom)
 */
export async function searchKnowledge(
  query: string,
  limit = 10,
  minSimilarity = 0.5
): Promise<Array<{ content: string; metadata: any; similarity: number }>> {
  const vectorStore = getVectorStore();

  try {
    const results = await vectorStore.search(query, limit, minSimilarity);

    return results.map(r => ({
      content: r.document.content,
      metadata: r.document.metadata,
      similarity: r.similarity
    }));
  } catch (error) {
    logger.error("Failed to search knowledge", error);
    return [];
  }
}

/**
 * Enhanced pattern retrieval with context
 */
export async function getContextualAdvice(
  scriptSnippet: string,
  problemDescription: string
): Promise<string> {
  const combinedQuery = `
Script: ${scriptSnippet.substring(0, 500)}
Problem: ${problemDescription}
  `.trim();

  const relevantPatterns = await findRelevantPatterns(combinedQuery, 3, 0.6);

  if (relevantPatterns.length === 0) {
    return "No specific patterns found. Apply general Qlik best practices.";
  }

  const advice = relevantPatterns.map((item, idx) => 
    `${idx + 1}. [${item.pattern.id}] ${item.pattern.title} (relevância: ${(item.similarity * 100).toFixed(1)}%)
   ${item.pattern.advice}`
  ).join('\n\n');

  return `Padrões relevantes identificados:\n\n${advice}`;
}
