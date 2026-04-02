import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/auth/firebaseClient";

export interface UploadProgress {
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
  url?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

/**
 * Generate a unique file path for storage
 */
function generateFilePath(folder: string, fileName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${folder}/${timestamp}_${randomStr}_${sanitizedName}`;
}

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param folder - The folder path in storage (e.g., "work-instructions", "defects")
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with the download URL
 */
export async function uploadFile(
  file: File,
  folder: string,
  onProgress?: UploadProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = generateFilePath(folder, file.name);
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.({
          progress,
          status: "uploading",
        });
      },
      (error) => {
        onProgress?.({
          progress: 0,
          status: "error",
          error: error.message,
        });
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.({
            progress: 100,
            status: "completed",
            url: downloadURL,
          });
          resolve(downloadURL);
        } catch (error) {
          const err = error as Error;
          onProgress?.({
            progress: 0,
            status: "error",
            error: err.message,
          });
          reject(error);
        }
      }
    );
  });
}

/**
 * Upload multiple files to Firebase Storage
 * @param files - Array of files to upload
 * @param folder - The folder path in storage
 * @param onProgress - Optional callback for overall progress
 * @returns Promise with array of download URLs
 */
export async function uploadMultipleFiles(
  files: File[],
  folder: string,
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = [];
  let completed = 0;

  for (const file of files) {
    const url = await uploadFile(file, folder);
    urls.push(url);
    completed++;
    onProgress?.(completed, files.length);
  }

  return urls;
}

/**
 * Delete a file from Firebase Storage by its URL
 * @param url - The download URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    // Extract the path from the download URL
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

/**
 * Get file type category from MIME type or filename
 */
export function getFileCategory(file: File | string): "image" | "pdf" | "document" | "spreadsheet" | "other" {
  const mimeType = typeof file === "string" ? "" : file.type;
  const fileName = typeof file === "string" ? file : file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
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
