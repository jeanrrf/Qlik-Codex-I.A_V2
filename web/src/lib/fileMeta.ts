import { UploadedFileMeta } from "../types/ui";

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function countLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

export function extractQvdRecordCount(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/<NoOfRecords>(\d+)<\/NoOfRecords>/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function buildUploadedFileMeta(params: {
  name: string;
  sizeBytes: number;
  content: string;
}): UploadedFileMeta {
  const { name, sizeBytes, content } = params;
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const warnings: string[] = [];
  const formattedSize = formatBytes(sizeBytes);

  const lineCount = extension === "qvd" ? undefined : countLines(content);
  const qvdRecords =
    extension === "qvd" ? extractQvdRecordCount(content) : undefined;

  if (extension === "qvd" && qvdRecords === undefined) {
    warnings.push("Numero de registros do QVD nao localizado no cabecalho.");
  }

  if (!content.trim()) {
    warnings.push("Conteudo do arquivo vazio ou nao lido como texto.");
  }

  if (sizeBytes > 5 * 1024 * 1024) {
    warnings.push("Arquivo acima de 5MB pode demorar para carregar no navegador.");
  }

  return {
    name,
    extension,
    sizeBytes,
    formattedSize,
    lineCount,
    qvdRecords,
    encoding: "utf-8",
    loadedAt: new Date().toISOString(),
    warnings
  };
}
