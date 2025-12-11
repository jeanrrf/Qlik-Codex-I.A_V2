# Vector Store & Semantic Search - Qlik Codex I.A

## Overview

The Vector Store system provides semantic search capabilities for the Qlik Codex I.A optimization engine. It enables intelligent retrieval of relevant best practices, anti-patterns, and contextual advice based on script content and optimization queries.

## Architecture

### Components

1. **VectorStore Service** (`server/src/services/vectorStore.ts`)
   - Manages vector embeddings and semantic search
   - Uses Google Gemini `text-embedding-004` model (768 dimensions)
   - Stores vectors in SQLite with JSON encoding
   - Implements LRU cache for performance

2. **Knowledge Indexer** (`server/src/services/knowledgeIndexer.ts`)
   - Indexes Qlik expert patterns into vector store
   - Provides semantic retrieval functions
   - Categorizes patterns for organization
   - Generates contextual advice

### Technology Stack

- **Embedding Model**: Google Gemini `text-embedding-004`
- **Embedding Dimension**: 768
- **Storage**: SQLite with JSON columns
- **Search Algorithm**: Cosine similarity
- **Cache**: In-memory LRU cache (100 entries)
- **Batch Size**: 10 documents per batch

## Features

### Vector Store

- **Document Management**
  - Add single or multiple documents
  - Update existing documents
  - Delete documents
  - Retrieve by ID

- **Semantic Search**
  - Cosine similarity-based ranking
  - Configurable minimum similarity threshold
  - Result limit control
  - Automatic caching of embeddings

- **Performance**
  - LRU cache for frequently accessed embeddings
  - Batch processing for multiple documents
  - Parallel embedding generation
  - Cache hit rate tracking

### Knowledge Indexer

- **Pattern Indexing**
  - Automatic indexing of all Qlik expert patterns
  - Pattern categorization (joins, performance, qvd, sql, etc.)
  - Rich content formatting for better matching

- **Retrieval Functions**
  - `findRelevantPatterns()` - Find patterns matching a query
  - `getPatternsByCategory()` - Get patterns in specific category
  - `searchKnowledge()` - Search all knowledge sources
  - `getContextualAdvice()` - Generate advice for script issues

- **Custom Knowledge**
  - Add user-defined knowledge documents
  - Integrate with built-in patterns
  - Flexible metadata support

## Usage

### Basic Vector Store Usage

```typescript
import { getVectorStore } from './services/vectorStore';

const vectorStore = getVectorStore();

// Add a document
await vectorStore.addDocument({
  id: 'my-doc-1',
  content: 'ApplyMap is faster than JOIN for simple lookups',
  metadata: { category: 'performance', author: 'expert' }
});

// Search
const results = await vectorStore.search(
  'How to optimize JOIN operations?',
  5,  // limit
  0.6 // minimum similarity
);

results.forEach(result => {
  console.log(`Document: ${result.document.id}`);
  console.log(`Similarity: ${result.similarity}`);
  console.log(`Content: ${result.document.content}`);
});
```

### Knowledge Indexer Usage

```typescript
import {
  indexQlikPatterns,
  findRelevantPatterns,
  getContextualAdvice
} from './services/knowledgeIndexer';

// Index all Qlik patterns (do this once at startup)
await indexQlikPatterns();

// Find relevant patterns
const patterns = await findRelevantPatterns(
  'My script has performance issues with JOINs',
  3,  // limit
  0.7 // minimum similarity
);

patterns.forEach(({ pattern, similarity }) => {
  console.log(`Pattern: ${pattern.title}`);
  console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`);
  console.log(`Advice: ${pattern.advice}`);
});

// Get contextual advice
const advice = await getContextualAdvice(
  'LOAD * FROM [lib://Data/Sales.qvd] (qvd);',
  'Script is loading slowly and using too much memory'
);

console.log(advice);
```

### Integration with Agents

```typescript
import { findRelevantPatterns } from './services/knowledgeIndexer';

// In your optimization agent
async function optimizeWithContext(script: string) {
  // Find relevant patterns for the script
  const relevantPatterns = await findRelevantPatterns(script, 5, 0.6);
  
  // Build context for LLM prompt
  const context = relevantPatterns.map(({ pattern, similarity }) => 
    `[${pattern.id}] ${pattern.title} (${(similarity * 100).toFixed(0)}%): ${pattern.advice}`
  ).join('\n');
  
  // Include in prompt
  const prompt = `
    Relevant patterns:
    ${context}
    
    Script to optimize:
    ${script}
  `;
  
  // Send to LLM...
}
```

## API Reference

### VectorStore Class

#### Methods

- `addDocument(doc: Omit<VectorDocument, 'createdAt'>): Promise<void>`
  - Adds a single document to the vector store

- `addDocuments(docs: Omit<VectorDocument, 'createdAt'>[]): Promise<void>`
  - Adds multiple documents in batches

- `search(query: string, limit?: number, minSimilarity?: number): Promise<SearchResult[]>`
  - Searches for semantically similar documents
  - Default limit: 5
  - Default minSimilarity: 0.5

- `getDocument(id: string): VectorDocument | null`
  - Retrieves a document by ID

- `deleteDocument(id: string): boolean`
  - Deletes a document, returns true if deleted

- `clearAll(): void`
  - Clears all documents and cache

- `getStats(): VectorStoreStats`
  - Returns statistics (total documents, indexed, cache hit rate)

- `rebuildEmbeddings(): Promise<void>`
  - Rebuilds all embeddings (useful after model changes)

### Knowledge Indexer Functions

- `indexQlikPatterns(): Promise<void>`
  - Indexes all Qlik expert patterns into vector store

- `findRelevantPatterns(query: string, limit?: number, minSimilarity?: number): Promise<Array<{ pattern: QlikPattern; similarity: number }>>`
  - Finds relevant Qlik patterns for a query

- `getPatternsByCategory(category: string, limit?: number): Promise<QlikPattern[]>`
  - Gets patterns in a specific category

- `searchKnowledge(query: string, limit?: number, minSimilarity?: number): Promise<Array<{ content: string; metadata: any; similarity: number }>>`
  - Searches all knowledge sources

- `addCustomKnowledge(id: string, content: string, metadata?: Record<string, any>): Promise<void>`
  - Adds custom knowledge document

- `getContextualAdvice(scriptSnippet: string, problemDescription: string): Promise<string>`
  - Generates contextual advice for a script issue

## Pattern Categories

The knowledge indexer automatically categorizes patterns:

- **joins** - JOIN operations and alternatives
- **qvd-optimization** - QVD loading best practices
- **mappings** - ApplyMap and MAPPING LOAD
- **sql-interaction** - SQL integration patterns
- **performance** - Performance optimization
- **data-loading** - Data loading techniques
- **data-model** - Data model design
- **date-handling** - Calendar and date functions
- **aggregations** - Aggregation functions
- **general** - General best practices

## Performance Optimization

### Caching Strategy

- LRU cache stores last 100 embeddings
- Cache key is the text content
- Average cache hit rate: 30-50% in typical usage

### Batch Processing

- Documents are processed in batches of 10
- Parallel embedding generation within batches
- Reduces API calls and latency

### Search Optimization

- Set appropriate minimum similarity threshold (0.5-0.7)
- Limit results to what you need (typically 3-10)
- Cache frequently used queries at application level

## Statistics & Monitoring

```typescript
const stats = vectorStore.getStats();

console.log(`Total documents: ${stats.totalDocuments}`);
console.log(`Indexed documents: ${stats.indexedDocuments}`);
console.log(`Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
```

## Testing

The vector store includes comprehensive test coverage:

- **Vector Store Tests**: 19 tests covering all core functionality
- **Knowledge Indexer Tests**: 17 tests covering pattern indexing and retrieval

Run tests:
```bash
cd server
npm test -- vectorStore.test.ts
npm test -- knowledgeIndexer.test.ts
```

## Environment Variables

Required for production use:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

The vector store will not function without a valid Gemini API key for embedding generation.

## Future Enhancements

Potential improvements:

1. **Vector Database**: Migrate to dedicated vector DB (Pinecone, Weaviate, Qdrant)
2. **Hybrid Search**: Combine semantic search with keyword matching
3. **Re-ranking**: Add cross-encoder for result re-ranking
4. **Chunking**: Implement smart text chunking for large documents
5. **Metadata Filtering**: Add pre-filtering by metadata before similarity search
6. **Multi-language**: Support embeddings in multiple languages
7. **Fine-tuning**: Custom fine-tuned embedding model for Qlik domain

## Troubleshooting

### No results returned

- Check minimum similarity threshold (try lowering to 0.3)
- Verify documents are indexed: `vectorStore.getStats()`
- Ensure embeddings were generated successfully

### Performance issues

- Check cache hit rate: `getStats().cacheHitRate`
- Reduce result limit
- Consider batch operations for multiple queries

### Memory usage

- Monitor total documents: `getStats().totalDocuments`
- Clear old documents if needed: `vectorStore.deleteDocument(id)`
- Adjust LRU cache size in code if necessary

## License

MIT - Part of Qlik Codex I.A project
