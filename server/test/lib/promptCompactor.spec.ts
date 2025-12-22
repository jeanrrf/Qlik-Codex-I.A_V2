import { describe, expect, it } from "vitest";

import { compactScriptForPrompt } from "../../src/lib/promptCompactor";

describe("compactScriptForPrompt", () => {
    it("preserva estrutura de blocos com defaults V2", () => {
        const script = [
            "LOAD  a    AS   field1;",
            "",
            "",
            "LEFT   JOIN (tableA)",
            "LOAD    b   ,   c   ;",
            "",
            "RESIDENT   tmp;"
        ].join("\n");

        const { compacted, stats } = compactScriptForPrompt(script);

        // V2: preserva indentação, mantém 1 blank line
        expect(compacted).toContain("LOAD  a    AS   field1;");
        expect(compacted).toContain("LEFT   JOIN (tableA)");
        expect(compacted).not.toContain("\n\n\n");
        expect(stats.applied).toBe(true);
    });

    it("colapsa espaços quando preserveIndentation=false", () => {
        const script = "LOAD   a    AS   field1;";
        const { compacted, stats } = compactScriptForPrompt(script, { preserveIndentation: false });

        expect(compacted).toBe("LOAD a AS field1;");
        expect(stats.applied).toBe(true);
    });

    it("mantém 1 blank line entre blocos com preserveBlockStructure=true", () => {
        const script = [
            "// Bloco 1",
            "",
            "",
            "",
            "// Bloco 2"
        ].join("\n");
        const { compacted } = compactScriptForPrompt(script, { maxConsecutiveBlanks: 1 });

        const lines = compacted.split("\n");
        const blankCount = lines.filter(l => l === "").length;
        expect(blankCount).toBe(1);
    });

    it("aplica sempre quando preserveBlockStructure ou preserveIndentation está ativo", () => {
        const script = "LOAD a;\nLOAD b;";
        const { stats } = compactScriptForPrompt(script, { preserveBlockStructure: true });

        expect(stats.applied).toBe(true);
    });

    it("respeita minReductionPct quando estrutura não está preservada", () => {
        const script = "LOAD a;\nLOAD b;";
        const { stats } = compactScriptForPrompt(script, {
            preserveBlockStructure: false,
            preserveIndentation: false,
            minReductionPct: 50
        });

        // Sem redução significativa e sem flags de preservação, não aplica
        expect(stats.reductionPct).toBeLessThan(50);
    });
});