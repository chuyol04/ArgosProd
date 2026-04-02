"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  uploadFile,
  getFileCategory,
  formatFileSize,
} from "@/lib/storage/fileUpload";
import {
  Upload,
  X,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "document" | "spreadsheet" | "other";
  size?: number;
  comment?: string;
}

interface PendingFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  url?: string;
}

interface FileUploaderProps {
  folder: string;
  existingFiles?: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onFileDelete?: (fileId: string, url: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string;
  disabled?: boolean;
  className?: string;
}

const FileTypeIcon = ({ type }: { type: UploadedFile["type"] }) => {
  switch (type) {
    case "image":
      return <ImageIcon className="h-6 w-6 text-green-500" />;
    case "pdf":
      return <FileText className="h-6 w-6 text-red-500" />;
    case "document":
      return <FileText className="h-6 w-6 text-blue-500" />;
    case "spreadsheet":
      return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
    default:
      return <FileIcon className="h-6 w-6 text-gray-500" />;
  }
};

export function FileUploader({
  folder,
  existingFiles = [],
  onFilesChange,
  onFileDelete,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt",
  disabled = false,
  className,
}: FileUploaderProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFiles = existingFiles.length + pendingFiles.filter(f => f.status === "completed").length;

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || disabled) return;

      const newFiles: PendingFile[] = [];
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      for (const file of Array.from(files)) {
        if (totalFiles + newFiles.length >= maxFiles) {
          alert(`Máximo ${maxFiles} archivos permitidos`);
          break;
        }

        if (file.size > maxSizeBytes) {
          alert(`"${file.name}" excede el límite de ${maxSizeMB}MB`);
          continue;
        }

        const id = `pending-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const category = getFileCategory(file);

        newFiles.push({
          id,
          file,
          preview: category === "image" ? URL.createObjectURL(file) : undefined,
          progress: 0,
          status: "pending",
        });
      }

      setPendingFiles((prev) => [...prev, ...newFiles]);

      // Start uploading
      for (const pendingFile of newFiles) {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pendingFile.id ? { ...f, status: "uploading" } : f
          )
        );

        try {
          const url = await uploadFile(
            pendingFile.file,
            folder,
            (progress) => {
              setPendingFiles((prev) =>
                prev.map((f) =>
                  f.id === pendingFile.id
                    ? { ...f, progress: progress.progress }
                    : f
                )
              );
            }
          );

          const uploadedFile: UploadedFile = {
            id: pendingFile.id,
            name: pendingFile.file.name,
            url,
            type: getFileCategory(pendingFile.file),
            size: pendingFile.file.size,
          };

          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === pendingFile.id
                ? { ...f, status: "completed", url }
                : f
            )
          );

          // Notify parent of new file
          onFilesChange([...existingFiles, uploadedFile]);
        } catch (error) {
          console.error("Upload error:", error);
          setPendingFiles((prev) =>
            prev.map((f) =>
              f.id === pendingFile.id
                ? { ...f, status: "error", error: "Error al subir archivo" }
                : f
            )
          );
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [folder, existingFiles, onFilesChange, disabled, maxFiles, maxSizeMB, totalFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleDeleteExisting = (fileId: string, url: string) => {
    onFileDelete?.(fileId, url);
    onFilesChange(existingFiles.filter((f) => f.id !== fileId));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Arrastra archivos aquí o haz click para seleccionar
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Máximo {maxSizeMB}MB por archivo, {maxFiles - totalFiles} restantes
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Pending Files (uploading) */}
      {pendingFiles.filter((f) => f.status !== "completed").length > 0 && (
        <div className="space-y-2">
          {pendingFiles
            .filter((f) => f.status !== "completed")
            .map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="h-10 w-10 object-cover rounded"
                  />
                ) : (
                  <FileTypeIcon type={getFileCategory(file.file)} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  {file.status === "uploading" && (
                    <Progress value={file.progress} className="h-1 mt-1" />
                  )}
                  {file.status === "error" && (
                    <p className="text-xs text-destructive">{file.error}</p>
                  )}
                </div>
                {file.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removePendingFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="group relative border rounded-lg overflow-hidden bg-card"
            >
              {file.type === "image" ? (
                <div className="aspect-video">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center p-4 bg-muted/30">
                  <FileTypeIcon type={file.type} />
                  <p className="text-xs text-muted-foreground mt-2 text-center truncate max-w-full">
                    {file.name}
                  </p>
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(file.url, "_blank")}
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {!disabled && onFileDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteExisting(file.id, file.url)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* File info footer */}
              <div className="p-2 border-t text-xs text-muted-foreground truncate">
                {file.name}
                {file.size && ` (${formatFileSize(file.size)})`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
