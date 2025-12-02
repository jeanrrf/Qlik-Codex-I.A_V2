import { describe, it, expect } from 'vitest';
import { validateQlikScript } from '../src/validators/qlikValidator';

describe('qlikValidator', () => {
  it('should pass valid Qlik script without warnings', () => {
    const script = `
LOAD
  Field1,
  Field2
FROM [lib://Data/file.qvd] (qvd);
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should detect SQL keywords outside SQL block', () => {
    const script = `
LOAD Field1 FROM table.qvd (qvd);
CREATE TABLE test;
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('CREATE'))).toBe(true);
  });

  it('should allow SQL keywords inside SQL block', () => {
    const script = `
SQL SELECT * FROM table;
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(true);
  });

  it('should detect suspicious Preceding LOAD without following statement', () => {
    const script = `
LOAD Field1;
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(false);
    expect(result.warnings.some(w => w.includes('Preceding LOAD'))).toBe(true);
  });

  it('should allow valid Preceding LOAD followed by SELECT', () => {
    const script = `
LOAD Field1;
SQL SELECT Field1 FROM table;
    `.trim();

    const result = validateQlikScript(script);
    // Should not have Preceding LOAD warning
    expect(result.warnings.some(w => w.includes('Preceding LOAD'))).toBe(false);
  });

  it('should detect NOCONCATENATE without following LOAD', () => {
    const script = `
NOCONCATENATE
DROP TABLE temp;
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(false);
    expect(result.warnings.some(w => w.includes('NOCONCATENATE'))).toBe(true);
  });

  it('should allow NOCONCATENATE followed by LOAD', () => {
    const script = `
NOCONCATENATE
LOAD Field1 FROM table.qvd (qvd);
    `.trim();

    const result = validateQlikScript(script);
    expect(result.warnings.some(w => w.includes('NOCONCATENATE'))).toBe(false);
  });

  it('should warn about implicit JOIN', () => {
    const script = `
JOIN LOAD Field1 RESIDENT Table1;
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(false);
    expect(result.warnings.some(w => w.includes('JOIN simples'))).toBe(true);
  });

  it('should allow LEFT JOIN without warning', () => {
    const script = `
LEFT JOIN LOAD Field1 RESIDENT Table1;
    `.trim();

    const result = validateQlikScript(script);
    // Should not have the implicit JOIN warning
    expect(result.warnings.some(w => w.includes('JOIN simples'))).toBe(false);
  });

  it('should handle complex script with multiple statements', () => {
    const script = `
// Load dimension table
DimTable:
LOAD
  ID,
  Name
FROM [lib://Data/dim.qvd] (qvd);

// Load fact table
FactTable:
LEFT JOIN (DimTable)
LOAD
  ID,
  Value
RESIDENT TempTable;

DROP TABLE TempTable;
    `.trim();

    const result = validateQlikScript(script);
    expect(result.safe).toBe(true);
  });
});
