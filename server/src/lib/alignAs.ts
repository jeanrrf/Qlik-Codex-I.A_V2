/**
 * Simple AS alignment utility for Qlik LOAD blocks.
 * It scans for LOAD blocks and vertically aligns the "AS" keywords
 * based on the longest LHS expression in each block.
 *
 * This is intentionally conservative to avoid reformatting unrelated code.
 */
export function alignAsInLoadBlocks(script: string): { fixed: string; changed: boolean } {
  const lines = script.split(/\r?\n/);
  const outLines: string[] = [];
  let i = 0;
  let changed = false;

  while (i < lines.length) {
    const line = lines[i];
    outLines.push(line);

    // Detect a LOAD line (start of a block)
    if (/^\s*LOAD\b/i.test(line)) {
      // Collect subsequent lines of the LOAD block until an empty line, a FROM/, or a line that ends with ';' that is not followed by more fields
      const blockStart = i + 1;
      const blockLines: { orig: string; idx: number }[] = [];
      let j = blockStart;

      while (j < lines.length) {
        const l = lines[j];
        // Stop conditions: a line starting with FROM (new clause), a line that is the start of another statement (no leading spaces) or a blank line
        if (/^\s*(FROM|JOIN|WHERE|INNER JOIN|LEFT JOIN|RIGHT JOIN|;|LET|TRACE)\b/i.test(l) || /^\S/.test(l)) {
          break;
        }

        blockLines.push({ orig: l, idx: j });
        j++;
      }

      if (blockLines.length > 0) {
        // Extract lines that contain 'AS' (case-insensitive) and look like field lines
        const asLines = blockLines.filter(b => /\bAS\b/i.test(b.orig));
        if (asLines.length > 0) {
          // Extract left side lengths
          const leftParts = asLines.map(b => {
            const split = b.orig.split(/\bAS\b/i);
            const left = split[0];
            return left.replace(/\t/g, '    ').replace(/\s+$/g, '');
          });

          const leftMax = Math.max(...leftParts.map(s => s.length));

          // Build fixed versions for the block
          const fixedBlock = blockLines.map(b => {
            if (/\bAS\b/i.test(b.orig)) {
              const parts = b.orig.split(/\bAS\b/i);
              const left = parts[0].replace(/\t/g, '    ').replace(/\s+$/g, '');
              const right = parts.slice(1).join('AS').trim();
              const padding = ' '.repeat(Math.max(1, leftMax - left.length + 1)); // at least one space before AS
              const leading = b.orig.match(/^\s*/)?.[0] || '';
              const fixedLine = `${leading}${left}${padding}AS ${right}`;
              return fixedLine;
            }
            return b.orig;
          });

          // Compare and replace in outLines (we previously pushed the original LOAD line and block lines were not yet added)
          // Remove the original placeholder lines we pushed and insert the fixed ones
          // We need to replace the next blockLines.length lines in outLines
          // First remove the last blockLines.length entries (they were appended in the loop)
          for (let k = 0; k < blockLines.length; k++) {
            outLines.pop();
          }

          fixedBlock.forEach(fl => outLines.push(fl));

          if (fixedBlock.some((fl, idx) => fl !== blockLines[idx].orig)) {
            changed = true;
          }

          // Advance i to j-1 (for loop will increment)
          i = j - 1;
        } else {
          // No AS lines, continue
          i = j - 1;
        }
      }
    }

    i++;
  }

  return { fixed: outLines.join('\n'), changed };
}
