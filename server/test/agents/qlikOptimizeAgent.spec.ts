import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const fixturesPath = path.resolve(__dirname, "..", "fixtures", "optimizerAgent");

vi.mock("../../src/lib/llmClient", () => {
  return {
    generateStructuredJson: vi.fn()
  };
});

describe("qlikOptimizeAgent - schema validation and fallback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("accepts a valid v1 LLM response and returns optimizedScript", async () => {
    const { generateStructuredJson } = await import("../../src/lib/llmClient");
    const generate = generateStructuredJson as unknown as ReturnType<typeof vi.fn>;

    const fixture = fs.readFileSync(path.join(fixturesPath, "valid_v1.json"), "utf8");
    generate.mockResolvedValue({ text: fixture, provider: "google" });

    const { runQlikOptimizeAgent } = await import("../../src/agents/qlikOptimizeAgent");

    const script = "LOAD A FROM X;";
    const res = await runQlikOptimizeAgent(script, "conservative");

    expect(res.originalScript).toBe(script);
    expect(res.optimizedScript).toContain("LOAD * FROM source;");
    expect(res.analysis.safeToApply).toBe(true);
  });

  it("handles malformed JSON by falling back to the original script", async () => {
    const { generateStructuredJson } = await import("../../src/lib/llmClient");
    const generate = generateStructuredJson as unknown as ReturnType<typeof vi.fn>;

    const fixture = fs.readFileSync(path.join(fixturesPath, "malformed.json"), "utf8");
    generate.mockResolvedValue({ text: fixture, provider: "google" });

    const { runQlikOptimizeAgent } = await import("../../src/agents/qlikOptimizeAgent");
    const script = "LOAD B FROM Y;";
    const res = await runQlikOptimizeAgent(script, "conservative");

    expect(res.originalScript).toBe(script);
    expect(res.optimizedScript).toBe(script);
    expect(res.analysis.safeToApply).toBe(false);
  });

  it("handles missing required keys by validating schema and falling back", async () => {
    const { generateStructuredJson } = await import("../../src/lib/llmClient");
    const generate = generateStructuredJson as unknown as ReturnType<typeof vi.fn>;

    const fixture = fs.readFileSync(path.join(fixturesPath, "missing_keys.json"), "utf8");
    generate.mockResolvedValue({ text: fixture, provider: "google" });

    const { runQlikOptimizeAgent } = await import("../../src/agents/qlikOptimizeAgent");
    const script = "LOAD C FROM Z;";
    const res = await runQlikOptimizeAgent(script, "conservative");

    expect(res.originalScript).toBe(script);
    expect(res.optimizedScript).toBe(script);
    expect(res.analysis.safeToApply).toBe(false);
  });
});
