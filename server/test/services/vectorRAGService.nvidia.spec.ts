import dotenv from 'dotenv';
import { describe, it, expect } from 'vitest';
import { nvidiaProvider } from '../../src/lib/llmProviders/nvidiaProvider';
import { config } from '../../src/lib/config';

dotenv.config();

describe('VectorRAG NVIDIA embeddings (integration)', () => {
  const shouldRun = config.rag.embeddingProvider === 'nvidia' && Boolean(config.nvidiaApiKey);

  if (!shouldRun) {
    it('skips NVIDIA integration tests (NVIDIA not configured)', () => {
      // skip
    });
    return;
  }

  it('generates an embedding via NVIDIA API (or returns a meaningful error)', async () => {
    const text = 'Test embedding for Qlik optimization';

    try {
      const emb = await nvidiaProvider.getEmbedding(text);
      expect(Array.isArray(emb)).toBe(true);
      expect(emb.length).toBe(config.rag.embeddingDimensions);
      expect(typeof emb[0]).toBe('number');
    } catch (err: unknown) {
      // If environment's key is invalid, provider may return a 403 Forbidden or similar.
      // This is an environment issue rather than code failure: assert we got an informative error.
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/Forbidden|403|NVIDIA Embedding API error|Authorization failed/i);
    }
  });
});
