import JSZip from "jszip";

import { OptimizeResult } from "../types/api";

function safeContent(value?: string): string {
  return value && value.trim().length > 0 ? value : "Conteudo nao fornecido pela AINEX.";
}

export async function downloadResultBundle(result: OptimizeResult): Promise<void> {
  const zip = new JSZip();

  zip.file("codigo_original.qvs", safeContent(result.originalScript));
  zip.file("codigo_otimizado.qvs", safeContent(result.optimizedScript));

  const documentation = safeContent(result.documentationMarkdown);
  zip.file("documentacao_markdown.md", documentation);

  const notes = safeContent(result.analysis.notes);
  const resumo = [
    `Resumo: ${result.summary || "Sem resumo fornecido."}`,
    `Modo: ${result.analysis.mode}`,
    `Risco: ${result.analysis.breakingRisk}`
  ].join("\n");
  zip.file("observacoes_ainex.txt", `${resumo}\n\nNotas:\n${notes}`);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `ainex-result-${Date.now()}.zip`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
