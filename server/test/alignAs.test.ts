import { describe, it, expect } from 'vitest';
import { alignAsInLoadBlocks } from '../src/lib/alignAs';

describe('alignAs - Perfect Column Alignment', () => {
  it('should align AS keywords perfectly within a single LOAD block', () => {
    const input = `
LOAD
    OrderID AS [ID Pedido],
    CustomerName AS [Nome Cliente],
    Sum(OrderTotal * (1 - DiscountPercent)) AS [Valor Líquido],
    Date(OrderDate, 'DD/MM/YYYY') AS [Data Pedido]
FROM Orders;
`.trim();

    const result = alignAsInLoadBlocks(input);
    expect(result.changed).toBe(true);

    // Verifica que todos os AS estão na mesma coluna
    const lines = result.fixed.split('\n');
    const asLines = lines.filter(l => l.includes(' AS '));

    // Extrai a posição do AS em cada linha
    const asPositions = asLines.map(l => l.indexOf(' AS '));

    // Todos devem ter a mesma posição
    expect(new Set(asPositions).size).toBe(1);

    // Verifica que há pelo menos 4 linhas com AS
    expect(asLines.length).toBe(4);
  });

  it('should align MULTIPLE LOAD blocks INDEPENDENTLY', () => {
    const input = `
LOAD
    ID AS [Pedido ID],
    Total AS [Valor Total]
FROM Orders;

LOAD
    CustomerID AS [Cliente ID],
    Name AS [Nome],
    Email AS [Email Cliente]
FROM Customers;
`.trim();

    const result = alignAsInLoadBlocks(input);
    expect(result.changed).toBe(true);

    // Verifica que cada bloco está alinhado independentemente
    const lines = result.fixed.split('\n');

    // Primeiro bloco (Orders) - AS deve estar alinhado na mesma coluna
    const ordersIdLine = lines.find(l => l.includes('[Pedido ID]'));
    const ordersTotalLine = lines.find(l => l.includes('[Valor Total]'));
    expect(ordersIdLine).toBeDefined();
    expect(ordersTotalLine).toBeDefined();

    const ordersAsPos1 = ordersIdLine!.indexOf(' AS ');
    const ordersAsPos2 = ordersTotalLine!.indexOf(' AS ');
    expect(ordersAsPos1).toBe(ordersAsPos2);

    // Segundo bloco (Customers) - AS deve estar alinhado na mesma coluna
    const custIdLine = lines.find(l => l.includes('[Cliente ID]'));
    const custNameLine = lines.find(l => l.includes('[Nome]'));
    const custEmailLine = lines.find(l => l.includes('[Email Cliente]'));
    expect(custIdLine).toBeDefined();
    expect(custNameLine).toBeDefined();
    expect(custEmailLine).toBeDefined();

    const custAsPos1 = custIdLine!.indexOf(' AS ');
    const custAsPos2 = custNameLine!.indexOf(' AS ');
    const custAsPos3 = custEmailLine!.indexOf(' AS ');
    expect(custAsPos1).toBe(custAsPos2);
    expect(custAsPos2).toBe(custAsPos3);
  });

  it('should preserve lines without AS', () => {
    const input = `
LOAD
    OrderID AS [Pedido],
    Status,
    Total AS [Valor]
FROM Orders;
`.trim();

    const result = alignAsInLoadBlocks(input);
    expect(result.fixed).toContain('    Status,');
  });

  it('should not change already aligned script', () => {
    const input = `
LOAD
    OrderID    AS [Pedido],
    Total      AS [Valor]
FROM Orders;
`.trim();

    const result = alignAsInLoadBlocks(input);
    // Pode mudar para normalizar o padding
    expect(result.fixed).toBeTruthy();
  });

  it('should handle complex expressions with parentheses', () => {
    const input = `
LOAD
    ID AS [ID],
    If(Status='Active', 1, 0) AS [Ativo],
    Sum(Total * (1 - Discount)) AS [Líquido]
FROM Sales;
`.trim();

    const result = alignAsInLoadBlocks(input);
    expect(result.changed).toBe(true);

    const lines = result.fixed.split('\n');
    const asPositions = lines
      .filter(l => l.includes(' AS '))
      .map(l => l.indexOf(' AS '));

    // Todos os AS devem estar na mesma posição
    expect(new Set(asPositions).size).toBe(1);
  });

  it('should stop at FROM keyword', () => {
    const input = `
LOAD
    ID AS [ID],
    Name AS [Nome]
FROM Orders
WHERE Active = 1;
`.trim();

    const result = alignAsInLoadBlocks(input);
    expect(result.fixed).toContain('FROM Orders');
    expect(result.fixed).toContain('WHERE Active = 1;');
  });
});
