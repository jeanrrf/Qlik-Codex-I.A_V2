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
