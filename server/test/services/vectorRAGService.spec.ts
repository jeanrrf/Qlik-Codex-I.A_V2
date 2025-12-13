import dotenv from 'dotenv';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { vectorRAGService } from '../../src/services/vectorRAGService';
import { initDb, closeDb } from '../../src/lib/dbAdapter';
import { config } from '../../src/lib/config';

// Load env vars
dotenv.config();

describe('VectorRAGService Integration', () => {
  beforeAll(async () => {
    // Initialize DB connection
    await initDb();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('should be enabled in configuration', () => {
    expect(config.rag.enabled).toBe(true);
    expect(vectorRAGService.isEnabled()).toBe(true);
  });

  it('should initialize vector tables', async () => {
    await vectorRAGService.initialize();
    // If no error is thrown, it's a success
    expect(true).toBe(true);
  });

  it('should perform a search (even if empty)', async () => {
    const results = await vectorRAGService.searchSimilar('LOAD * FROM [data.csv];');
    expect(Array.isArray(results)).toBe(true);
    // We don't expect results necessarily, but it shouldn't throw
  });

  it('should generate embeddings via Google provider', async () => {
    // This tests the integration with Google Gemini for embeddings
    // We access the private method via any cast or just rely on searchSimilar calling it
    // But let's try to use searchSimilar which calls generateEmbedding

    const start = Date.now();
    const results = await vectorRAGService.searchSimilar('Test script for embedding generation');
    const duration = Date.now() - start;

    console.log(`Search took ${duration}ms`);
    expect(Array.isArray(results)).toBe(true);
  });
});
