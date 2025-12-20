import { describe, it, expect } from 'vitest';
import { validateQlikScript } from '../../src/validators/qlikValidator';

/**
 * Testes para detectar o bug reportado pelo usuário:
 * LLM gerando código Qlik incompleto (campos sem LOAD/SELECT keywords)
 */
describe('Incomplete Code Detection (User Bug Report)', () => {
  it('should detect field list without LOAD keyword (CRITICAL BUG)', () => {
    // Este é o tipo exato de código que o usuário reportou
    const incompleteScript = `
    C7_FILIAL,
    C7_NUM,
    C7_ITEM,
        C7_PRODUTO                      AS CodProduto,
        C7_FORNECE                      AS CodFornecedor,
        C7_EMISSAO                      AS DataPedido
FROM SC7010;
    `.trim();

    const result = validateQlikScript(incompleteScript);
    expect(result.safe).toBe(false);
    expect(result.warnings.some(w => w.includes('CRÍTICO'))).toBe(true);
    expect(result.warnings.some(w => w.includes('FROM encontrado sem LOAD'))).toBe(true);
  });

  it('should detect another incomplete pattern from user report', () => {
    const incompleteScript = `
        B1_COD    AS CodProduto,
        B1_DESC   AS DescProduto,
        B1_TIPO   AS TipoMaterial
FROM SB1010;
    `.trim();

    const result = validateQlikScript(incompleteScript);
    expect(result.safe).toBe(false);
    expect(result.warnings.some(w => w.includes('CRÍTICO'))).toBe(true);
  });

  it('should allow complete LOAD statement', () => {
    const completeScript = `
LOAD
    C7_FILIAL,
    C7_NUM,
    C7_ITEM,
    C7_PRODUTO                      AS CodProduto,
    C7_FORNECE                      AS CodFornecedor,
    C7_EMISSAO                      AS DataPedido
FROM
    SC7010;
    `.trim();

    const result = validateQlikScript(completeScript);
    // Should not have critical incomplete code warnings
    expect(result.warnings.some(w => w.includes('CRÍTICO'))).toBe(false);
  });

  it('should allow complete SQL SELECT statement', () => {
    const completeScript = `
SQL SELECT
    B1_COD    AS CodProduto,
    B1_DESC   AS DescProduto,
    B1_TIPO   AS TipoMaterial
FROM
    SB1010;
    `.trim();

    const result = validateQlikScript(completeScript);
    expect(result.warnings.some(w => w.includes('CRÍTICO'))).toBe(false);
  });

  it('should detect incomplete TRACE separator from user report', () => {
    const scriptWithIncompleteTrace = `
TRACE ─────────────────────────────────────────────────;

        Z9M_CODPROD AS CodProduto,
        Z9M_CLAABC  AS CurvaABC
FROM Z9M010;
    `.trim();

    const result = validateQlikScript(scriptWithIncompleteTrace);
    expect(result.safe).toBe(false);
    expect(result.warnings.some(w => w.includes('FROM encontrado sem LOAD'))).toBe(true);
  });

  it('should allow complete script with proper TRACE separators', () => {
    const completeScript = `
TRACE ─────────────────────────────────────────────────;
TRACE     DIMENSÃO: CURVA ABC PRODUTO                ;
TRACE ─────────────────────────────────────────────────;

LOAD
    Z9M_CODPROD AS CodProduto,
    Z9M_CLAABC  AS CurvaABC
FROM
    Z9M010;
    `.trim();

    const result = validateQlikScript(completeScript);
    expect(result.warnings.some(w => w.includes('CRÍTICO'))).toBe(false);
  });

  it('should detect multiple incomplete statements in same script', () => {
    const multipleIncompleteScript = `
    C7_FILIAL,
    C7_NUM
FROM SC7010;

    B1_COD,
    B1_DESC
FROM SB1010;
    `.trim();

    const result = validateQlikScript(multipleIncompleteScript);
    expect(result.safe).toBe(false);
    // Should detect at least 2 critical errors
    const criticalWarnings = result.warnings.filter(w => w.includes('CRÍTICO'));
    expect(criticalWarnings.length).toBeGreaterThanOrEqual(2);
  });
});
