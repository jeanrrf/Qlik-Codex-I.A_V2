#!/usr/bin/env node

/**
 * DUPLICATE CODE ANALYZER
 * Escaneia o projeto buscando por duplicações de código
 * Útil para identificar futuras oportunidades de refactor
 */

const fs = require("fs");
const path = require("path");

interface FileAnalysis {
  path: string;
  lines: number;
  functions: string[];
  imports: string[];
  hash: string;
}

const getFiles = (dir, ext) => {
  const files = [];
  const traverse = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.name.endsWith(ext)) {
        files.push(fullPath);
      }
    }
  };
  traverse(dir);
  return files;
};

const hashContent = (content) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

const analyzeTsFile = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find functions
  const functionPattern = /^\s*(async\s+)?function\s+(\w+)|^\s*const\s+(\w+)\s*=\s*(async\s*)?\(/gm;
  const functions = [];
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push(match[2] || match[3]);
  }

  // Find imports
  const importPattern = /^import\s+.*from\s+["'](.*?)["']/gm;
  const imports = [];
  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return {
    path: filePath,
    lines: lines.length,
    functions,
    imports,
    hash: hashContent(content)
  };
};

const main = () => {
  const args = process.argv.slice(2);
  const targetDir = args[0] || "./server/src";
  const ext = args[1] || ".ts";

  console.log(`📊 Analisando duplicações em ${targetDir}...\n`);

  const files = getFiles(targetDir, ext);
  const analyses = files.map(analyzeTsFile);

  // Group by file size (potencial código similar)
  const sizeGroups = {};
  for (const analysis of analyses) {
    const sizeRange = Math.floor(analysis.lines / 50) * 50;
    if (!sizeGroups[sizeRange]) sizeGroups[sizeRange] = [];
    sizeGroups[sizeRange].push(analysis);
  }

  // Find candidates
  console.log("🔍 CANDIDATOS PARA CONSOLIDAÇÃO:\n");

  for (const [size, group] of Object.entries(sizeGroups)) {
    if (group.length > 1) {
      const files_in_range = group as FileAnalysis[];
      console.log(`\n📦 Arquivos com ${size}-${parseInt(size) + 50} linhas (${files_in_range.length} arquivos):`);

      for (const file of files_in_range) {
        const commonImports = file.imports
          .filter((imp) => files_in_range.some((f) => f.imports.includes(imp)))
          .slice(0, 3);

        console.log(
          `  • ${path.relative(targetDir, file.path)} (${file.lines} linhas, ${file.functions.length} functions)`
        );
        if (commonImports.length > 0) {
          console.log(`    └─ Shared imports: ${commonImports.join(", ")}`);
        }
      }
    }
  }

  // Statistics
  console.log("\n\n📈 ESTATÍSTICAS:\n");
  console.log(`Total de arquivos: ${files.length}`);
  console.log(`Total de linhas: ${analyses.reduce((sum, a) => sum + a.lines, 0)}`);
  console.log(
    `Média de linhas por arquivo: ${Math.round(analyses.reduce((sum, a) => sum + a.lines, 0) / files.length)}`
  );

  const totalFunctions = analyses.reduce((sum, a) => sum + a.functions.length, 0);
  console.log(`Total de functions: ${totalFunctions}`);
  console.log(`Média de functions por arquivo: ${Math.round(totalFunctions / files.length)}`);

  // Find duplicate imports
  const allImports = {};
  for (const analysis of analyses) {
    for (const imp of analysis.imports) {
      if (!allImports[imp]) allImports[imp] = [];
      allImports[imp].push(path.basename(analysis.path));
    }
  }

  const duplicateImports = Object.entries(allImports)
    .filter(([_, files]) => files.length > 3)
    .sort((a, b) => (b[1] as string[]).length - (a[1] as string[]).length)
    .slice(0, 5);

  if (duplicateImports.length > 0) {
    console.log("\n\n⚠️ TOP 5 IMPORTS MAIS REUTILIZADOS:\n");
    for (const [imp, files] of duplicateImports) {
      console.log(`  • "${imp}": importado em ${(files as string[]).length} arquivos`);
    }
  }

  console.log("\n✅ Análise concluída!\n");
};

main();
