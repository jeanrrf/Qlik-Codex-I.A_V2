import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProviderCallOptions } from "../../src/lib/llmProviders/types";

// Mock the config before importing googleProvider
vi.mock("../../src/lib/config", () => ({
  config: {
    geminiApiKey: "",
    geminiModel: "gemini-2.5-flash",
    geminiDefaultMaxOutputTokens: 8192,
    geminiExtendedMaxOutputTokens: 16384
  }
}));

// Mock logger
vi.mock("../../src/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

// Mock resilience
vi.mock("../../src/lib/resilience", () => ({
  withTimeout: vi.fn((promise) => promise)
}));

// Mock Google GenAI
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn()
}));

describe("googleProvider.resolveMaxOutputTokens", () => {
  // Import the function to test
  let resolveMaxOutputTokens: (options?: ProviderCallOptions) => { maxOutputTokens: number; source: string };

  beforeEach(async () => {
    const module = await import("../../src/lib/llmProviders/googleProvider");
    resolveMaxOutputTokens = module.resolveMaxOutputTokens;
  });

  it("uses explicit maxOutputTokens when provided", () => {
    const result = resolveMaxOutputTokens({ maxOutputTokens: 12000 });
    expect(result).toEqual({
      maxOutputTokens: 12000,
      source: "opcao_explicita"
    });
  });

  it("uses taskType mapping for formatting task", () => {
    const result = resolveMaxOutputTokens({ taskType: "formatting" });
    expect(result).toEqual({
      maxOutputTokens: 16384,
      source: "taskType:formatting"
    });
  });

  it("uses taskType mapping for long_form task", () => {
    const result = resolveMaxOutputTokens({ taskType: "long_form" });
    expect(result).toEqual({
      maxOutputTokens: 16384,
      source: "taskType:long_form"
    });
  });

  it("uses taskType mapping for documentation task", () => {
    const result = resolveMaxOutputTokens({ taskType: "documentation" });
    expect(result).toEqual({
      maxOutputTokens: 16384,
      source: "taskType:documentation"
    });
  });

  it("falls back to default when no options provided", () => {
    const result = resolveMaxOutputTokens();
    expect(result).toEqual({
      maxOutputTokens: 8192,
      source: "padrao"
    });
  });

  it("falls back to default when empty options provided", () => {
    const result = resolveMaxOutputTokens({});
    expect(result).toEqual({
      maxOutputTokens: 8192,
      source: "padrao"
    });
  });

  it("falls back to default for unknown taskType", () => {
    const result = resolveMaxOutputTokens({ taskType: "unknown_task" });
    expect(result).toEqual({
      maxOutputTokens: 8192,
      source: "padrao"
    });
  });

  it("prioritizes explicit maxOutputTokens over taskType", () => {
    const result = resolveMaxOutputTokens({
      maxOutputTokens: 10000,
      taskType: "formatting"
    });
    expect(result).toEqual({
      maxOutputTokens: 10000,
      source: "opcao_explicita"
    });
  });

  it("ignores maxOutputTokens when zero and uses taskType", () => {
    const result = resolveMaxOutputTokens({
      maxOutputTokens: 0,
      taskType: "formatting"
    });
    expect(result).toEqual({
      maxOutputTokens: 16384,
      source: "taskType:formatting"
    });
  });

  it("ignores maxOutputTokens when zero and falls back to default", () => {
    const result = resolveMaxOutputTokens({ maxOutputTokens: 0 });
    expect(result).toEqual({
      maxOutputTokens: 8192,
      source: "padrao"
    });
  });

  it("ignores negative maxOutputTokens", () => {
    const result = resolveMaxOutputTokens({ maxOutputTokens: -100 });
    expect(result).toEqual({
      maxOutputTokens: 8192,
      source: "padrao"
    });
  });

  it("ignores negative maxOutputTokens even with valid taskType", () => {
    const result = resolveMaxOutputTokens({
      maxOutputTokens: -100,
      taskType: "documentation"
    });
    expect(result).toEqual({
      maxOutputTokens: 16384,
      source: "taskType:documentation"
    });
  });
});
