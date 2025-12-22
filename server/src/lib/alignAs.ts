/**
 * Alinha perfeitamente as colunas renomeadas com AS em blocos LOAD do Qlik.
 * Processa CADA bloco LOAD individualmente para garantir alinhamento perfeito
 * dos AS dentro de cada bloco, independente de outros blocos.
 * 
 * Corrige o bug onde múltiplos blocos LOAD não eram alinhados corretamente.
 */
export function alignAsInLoadBlocks(script: string): { fixed: string; changed: boolean } {
  const lines = script.split(/\r?\n/);
  const outLines: string[] = [];
  let changed = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detecta início de um bloco LOAD
    if (/^\s*LOAD\b/i.test(line)) {
      // Adiciona a linha LOAD
      outLines.push(line);
      i++;

      // Coleta todas as linhas do bloco (campos até FROM/WHERE/JOIN/novo statement)
      const blockLines: string[] = [];
      let blockEndIdx = i;

      while (blockEndIdx < lines.length) {
        const l = lines[blockEndIdx];
        const trimmed = l.trim();

        // Verifica se é fim do bloco LOAD
        // Para quando encontra: FROM, WHERE, JOIN, novo statement (não-indentado), linha vazia, ou ponto-e-vírgula sozinho
        if (!trimmed ||
          /^\s*(FROM|WHERE|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|OUTER\s+JOIN)\b/i.test(l) ||
          /^\s*;/.test(l) ||
          /^(LOAD|SQL|SELECT|DROP|LET|SET|TRACE|STORE|CALL|FOR|NEXT|SUB|END\s+SUB)\b/i.test(trimmed)) {
          break;
        }

        blockLines.push(l);
        blockEndIdx++;
      }

      // Se encontrou linhas no bloco, processa alinhamento
      if (blockLines.length > 0) {
        // Filtra apenas linhas com AS
        const asLines = blockLines
          .map((orig, idx) => ({ orig, idx, hasAs: /\bAS\b/i.test(orig) }))
          .filter(item => item.hasAs);

        if (asLines.length > 0) {
          // Calcula o comprimento máximo da parte esquerda (antes do AS)
          let maxLeftLength = 0;
          const processedLines = asLines.map(item => {
            // Split no AS (case-insensitive)
            const parts = item.orig.split(/\bAS\b/i);
            const leftPart = parts[0]
              .replace(/\t/g, '    ')  // Normaliza tabs
              .replace(/\s+$/g, '');    // Remove espaços trailing

            maxLeftLength = Math.max(maxLeftLength, leftPart.length);

            return {
              ...item,
              leftPart,
              rightPart: parts.slice(1).join('AS').trim(),
              leadingSpaces: item.orig.match(/^\s*/)?.[0] || ''
            };
          });

          // Reconstrói as linhas com AS alinhados
          const alignedBlockLines = blockLines.map((orig, idx) => {
            const processedLine = processedLines.find(p => p.idx === idx);

            if (processedLine) {
              // Calcula padding necessário para alinhar
              const padding = ' '.repeat(Math.max(1, maxLeftLength - processedLine.leftPart.length + 1));
              const alignedLine = `${processedLine.leadingSpaces}${processedLine.leftPart}${padding}AS ${processedLine.rightPart}`;

              if (alignedLine !== orig) {
                changed = true;
              }

              return alignedLine;
            }

            return orig; // Linha sem AS, mantém original
          });

          // Adiciona linhas alinhadas ao output
          outLines.push(...alignedBlockLines);
        } else {
          // Bloco sem AS, mantém original
          outLines.push(...blockLines);
        }
      }

      // Avança índice para após o bloco processado
      i = blockEndIdx;
    } else {
      // Não é LOAD, adiciona linha normal
      outLines.push(line);
      i++;
    }
  }

  return { fixed: outLines.join('\n'), changed };
}
