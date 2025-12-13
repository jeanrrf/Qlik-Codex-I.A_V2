export interface UploadedFileMeta {
  name: string;
  extension: string;
  sizeBytes: number;
  formattedSize: string;
  lineCount?: number;
  qvdRecords?: number;
  encoding: "utf-8" | "unknown";
  loadedAt: string;
  warnings: string[];
}

export interface UploadedFilePayload {
  content: string;
  meta: UploadedFileMeta;
}

export interface ScriptAnalysisData {
  fileType: 'qvd' | 'qvs' | 'txt' | 'unknown';
  size: 'small' | 'medium' | 'large' | 'xlarge';
  complexity: 'low' | 'medium' | 'high' | 'critical';
  lines: number;
  estimatedTokens: number;
  qvdOperations?: {
    reads: number;
    writes: number;
  } | null;
  strategy: 'full' | 'optimized';
}
