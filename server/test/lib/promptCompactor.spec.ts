import { describe, expect, it } from "vitest";

import { compactScriptForPrompt } from "../../src/lib/promptCompactor";

describe("compactScriptForPrompt", () => {
    it("reduce blank streaks and collapses spaces while preserving lines", () => {
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

        expect(compacted).toContain("LOAD a AS field1;");
        expect(compacted).toContain("LEFT JOIN (tableA)");
        expect(compacted).not.toContain("\n\n\n");
        expect(stats.applied).toBe(true);
        expect(stats.reductionPct).toBeGreaterThan(0);
    });

    it("keeps original when reduction is below threshold", () => {
        const script = "LOAD a;\nLOAD b;";
        const { compacted, stats } = compactScriptForPrompt(script, 10);

        expect(compacted).toBe(script);
        expect(stats.applied).toBe(false);
        expect(stats.reductionPct).toBe(0);
    });
});