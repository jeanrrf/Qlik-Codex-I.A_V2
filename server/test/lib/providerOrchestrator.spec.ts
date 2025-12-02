/**
 * Testes para ProviderOrchestrator
 * Valida timeout, rotação de provedores e fallback
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProviderOrchestrator } from "../../src/lib/providerOrchestrator";
import type { OptimizationStepId } from "../../src/types/optimization";

// Mock dos provedores
vi.mock("../../src/lib/llmProviders/googleProvider", () => ({
  googleProvider: {
    name: "google",
    isAvailable: () => true,
    generateStructuredJson: vi.fn()
  }
}));

vi.mock("../../src/lib/llmProviders/nvidiaProvider", () => ({
  nvidiaProvider: {
    name: "nvidia",
    isAvailable: () => true,
    generateStructuredJson: vi.fn()
  }
}));

describe("ProviderOrchestrator", () => {
  let orchestrator: ProviderOrchestrator;

  beforeEach(() => {
    orchestrator = new ProviderOrchestrator({
      maxAttemptsPerStep: 4,
      providerOrder: ["google", "nvidia"],
      neverRetryProvider: true,
      timeoutPerStep: 1000,
      globalTimeout: 10000
    });
  });

  describe("Timeout", () => {
    it("deve falhar por timeout quando provider demora muito", async () => {
      const stepId: OptimizationStepId = "pre_001_parse_script_syntax";
      const prompt = "test prompt";
      const timeout = 100; // 100ms timeout

      // Mock que demora 200ms (mais que o timeout) - deve rejeitar para simular timeout
      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      vi.mocked(googleProvider.generateStructuredJson).mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 200))
      );

      // Nvidia também falha para garantir fallback
      vi.mocked(nvidiaProvider.generateStructuredJson).mockRejectedValue(
        new Error("Also fails")
      );

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(true); // Ambos falharam
      expect(result.attempts.length).toBeGreaterThan(1);
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[0].error).toContain("Timeout");
    });

    it("deve continuar para próximo provider após timeout", async () => {
      const stepId: OptimizationStepId = "pre_002_extract_metadata";
      const prompt = "test prompt";
      const timeout = 100;

      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      // Google timeout, Nvidia sucesso
      vi.mocked(googleProvider.generateStructuredJson).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      vi.mocked(nvidiaProvider.generateStructuredJson).mockResolvedValue({
        text: '{"result":"success"}',
        provider: "nvidia",
        metadata: { model: "qwen3" }
      });

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(false);
      expect(result.result).toBe('{"result":"success"}');
      expect(result.attempts.length).toBe(2);
      expect(result.attempts[0].provider).toBe("google");
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].provider).toBe("nvidia");
      expect(result.attempts[1].success).toBe(true);
    });
  });

  describe("Rotação de Provedores", () => {
    it("não deve repetir o mesmo provider quando neverRetryProvider=true", async () => {
      const stepId: OptimizationStepId = "struct_016_table_dependency_graph";
      const prompt = "test prompt";
      const timeout = 1000;

      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      // Ambos falham
      vi.mocked(googleProvider.generateStructuredJson).mockRejectedValue(
        new Error("Google error")
      );
      vi.mocked(nvidiaProvider.generateStructuredJson).mockRejectedValue(
        new Error("Nvidia error")
      );

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(true);
      expect(result.attempts.length).toBe(2); // Google + Nvidia (sem repetir)

      const providers = result.attempts.map((a) => a.provider);
      expect(providers).toEqual(["google", "nvidia"]);
    });

    it("deve tentar até maxAttemptsPerStep vezes", async () => {
      orchestrator = new ProviderOrchestrator({
        maxAttemptsPerStep: 4,
        providerOrder: ["google", "nvidia"],
        neverRetryProvider: false, // permite repetir
        timeoutPerStep: 1000,
        globalTimeout: 10000
      });

      const stepId: OptimizationStepId = "perf_036_sql_pushdown_opportunities";
      const prompt = "test";
      const timeout = 1000;

      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      vi.mocked(googleProvider.generateStructuredJson).mockRejectedValue(
        new Error("Always fails")
      );
      vi.mocked(nvidiaProvider.generateStructuredJson).mockRejectedValue(
        new Error("Always fails")
      );

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(true);
      expect(result.attempts.length).toBeLessThanOrEqual(4);
    });
  });

  describe("Fallback", () => {
    it("deve acionar fallback após todas as tentativas falharem", async () => {
      const stepId: OptimizationStepId = "quality_066_naming_conventions";
      const prompt = "test";
      const timeout = 1000;

      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      vi.mocked(googleProvider.generateStructuredJson).mockRejectedValue(
        new Error("Fail")
      );
      vi.mocked(nvidiaProvider.generateStructuredJson).mockRejectedValue(
        new Error("Fail")
      );

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(true);
      expect(result.fallbackReason).toBeDefined();
      expect(result.fallbackReason).toContain("falharam");
      expect(result.result).toBeUndefined();
    });

    it("deve incluir informações dos provedores testados no fallback", async () => {
      const stepId: OptimizationStepId = "post_086_syntax_validation";
      const prompt = "test";
      const timeout = 1000;

      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      vi.mocked(googleProvider.generateStructuredJson).mockRejectedValue(
        new Error("Google fail")
      );
      vi.mocked(nvidiaProvider.generateStructuredJson).mockRejectedValue(
        new Error("Nvidia fail")
      );

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(true);
      expect(result.fallbackReason).toContain("google");
      expect(result.fallbackReason).toContain("nvidia");
    });
  });

  describe("Sucesso", () => {
    it("deve retornar sucesso no primeiro provider quando tudo funciona", async () => {
      const stepId: OptimizationStepId = "result_112_final_summary";
      const prompt = "test";
      const timeout = 1000;

      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");

      vi.mocked(googleProvider.generateStructuredJson).mockResolvedValue({
        text: '{"success":true}',
        provider: "google",
        metadata: { model: "gemini-1.5-flash" }
      });

      const result = await orchestrator.executeWithRotation(stepId, prompt, timeout);

      expect(result.fallbackTriggered).toBe(false);
      expect(result.result).toBe('{"success":true}');
      expect(result.attempts.length).toBe(1);
      expect(result.attempts[0].provider).toBe("google");
      expect(result.attempts[0].success).toBe(true);
    });
  });

  describe("Estatísticas", () => {
    it("deve rastrear estatísticas de tentativas", async () => {
      const { googleProvider } = await import("../../src/lib/llmProviders/googleProvider");
      const { nvidiaProvider } = await import("../../src/lib/llmProviders/nvidiaProvider");

      // Primeira chamada: Google sucesso
      vi.mocked(googleProvider.generateStructuredJson).mockResolvedValueOnce({
        text: '{"ok":1}',
        provider: "google",
        metadata: {}
      });

      await orchestrator.executeWithRotation(
        "pre_001_parse_script_syntax",
        "test1",
        1000
      );

      // Segunda chamada: Google falha, Nvidia sucesso
      vi.mocked(googleProvider.generateStructuredJson).mockRejectedValueOnce(
        new Error("Fail")
      );
      vi.mocked(nvidiaProvider.generateStructuredJson).mockResolvedValueOnce({
        text: '{"ok":2}',
        provider: "nvidia",
        metadata: {}
      });

      await orchestrator.executeWithRotation(
        "pre_002_extract_metadata",
        "test2",
        1000
      );

      const stats = orchestrator.getStats();

      expect(stats.totalAttempts).toBeGreaterThanOrEqual(3);
      expect(stats.successfulAttempts).toBeGreaterThanOrEqual(2);
      expect(stats.providerStats.google).toBeDefined();
      expect(stats.providerStats.nvidia).toBeDefined();
    });
  });
});
