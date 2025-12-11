/**
 * Shared test utilities for vector store testing
 */

import { vi } from "vitest";

// Mock embedding constants
export const MOCK_EMBEDDING_DIMENSION = 768;
export const MOCK_EMBEDDING_FREQUENCY = 0.1;
export const MOCK_EMBEDDING_OFFSET = 0.5;

/**
 * Create a deterministic mock embedding based on text length
 */
export function createMockEmbedding(text: string): number[] {
  return new Array(MOCK_EMBEDDING_DIMENSION).fill(0).map((_, i) => 
    Math.sin(text.length * i * MOCK_EMBEDDING_FREQUENCY) * MOCK_EMBEDDING_OFFSET + MOCK_EMBEDDING_OFFSET
  );
}

/**
 * Mock Google GenAI for testing
 */
export function createMockGoogleGenAI() {
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
}

/**
 * Mock config with test API key
 */
export async function createMockConfig() {
  const actual = await vi.importActual("../../src/lib/config");
  return {
    ...actual,
    config: {
      ...(actual as any).config,
      geminiApiKey: "test-api-key-for-testing"
    }
  };
}
