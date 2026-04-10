export interface UploadProgress {
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  mediaId?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Build the view URL for a media_id
 */
export function mediaViewUrl(mediaId: string): string {
  return `/api/media/view/${mediaId}`;
}

/**
 * Build the download URL for a media_id
 */
export function mediaDownloadUrl(mediaId: string): string {
  return `/api/media/download/${mediaId}`;
}

/**
 * Upload a file to MongoDB GridFS via the /api/media/upload endpoint
 * @returns media_id string
 */
export async function uploadFile(
  file: File,
  _folder: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  onProgress?.({ progress: 10, status: "uploading" });

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    const message = err.error || err.message || "Error al subir archivo";
    onProgress?.({ progress: 0, status: "error", error: message });
    throw new Error(message);
  }

  const data = await res.json();
  const mediaId = data.media_id as string;

  onProgress?.({ progress: 100, status: "completed", mediaId });
  return mediaId;
}

/**
 * Upload multiple files
 * @returns Array of media_id strings
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: string,
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const ids: string[] = [];
  let completed = 0;

  for (const file of files) {
    const id = await uploadFile(file, folder);
    ids.push(id);
    completed++;
    onProgress?.(completed, files.length);
  }

  return ids;
}

/**
 * Delete a file from MongoDB GridFS
 * @param mediaId - The media_id to delete
 */
export async function deleteFile(mediaId: string): Promise<void> {
  const res = await fetch(`/api/media/delete/${mediaId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    console.error("Error deleting file:", await res.text());
    throw new Error("Error al eliminar archivo");
  }
}

/**
 * Get file type category from MIME type or filename
 */
export function getFileCategory(
  file: File | string
): "image" | "pdf" | "document" | "spreadsheet" | "other" {
  const mimeType = typeof file === "string" ? "" : file.type;
  const fileName = typeof file === "string" ? file : file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (
    mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
  ) {
    return "image";
  }
  if (mimeType === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    ["doc", "docx", "odt", "rtf", "txt"].includes(ext)
  ) {
    return "document";
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ["xls", "xlsx", "csv", "ods"].includes(ext)
  ) {
    return "spreadsheet";
  }
  return "other";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
