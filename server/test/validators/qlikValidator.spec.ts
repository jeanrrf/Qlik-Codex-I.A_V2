import { describe, it, expect } from "vitest";

import { validateQlikScript } from "../../src/validators/qlikValidator";

describe("validateQlikScript", () => {
  it("flags prohibited SQL keywords outside SQL blocks", () => {
    const script = `
      LOAD * FROM Source;
      CREATE TABLE Foo;
    `;

    const result = validateQlikScript(script);
    expect(result.safe).toBe(false);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toMatch(/CREATE/);
  });

  it("allows SQL keywords inside multi-line SQL blocks", () => {
    const script = `
      SQL SELECT *
      FROM tabela
      WHERE campo = 'value';
      LOAD * RESIDENT tabela;
    `;

    const result = validateQlikScript(script);
    expect(result.safe).toBe(true);
  });

  it("handles SQL blocks that end on the same line", () => {
    const script = `
      SQL SELECT * FROM tabela;
      INSERT INTO Foo;
    `;

    const result = validateQlikScript(script);
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toMatch(/INSERT/);
  });
});
