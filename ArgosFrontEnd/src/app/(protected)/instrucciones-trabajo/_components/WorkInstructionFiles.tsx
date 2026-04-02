"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  uploadFile,
  getFileCategory,
  formatFileSize,
} from "@/lib/storage/fileUpload";
import {
  addWorkInstructionEvidence,
  deleteWorkInstructionEvidence,
} from "@/app/(protected)/instrucciones-trabajo/actions/instrucciones-trabajo.actions";
import { IEvidence } from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";
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

interface PendingUpload {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "uploading" | "saving" | "completed" | "error";
  error?: string;
}

interface WorkInstructionFilesProps {
  workInstructionId: number | null;
  existingFiles: IEvidence[];
  onFilesChange: (files: IEvidence[]) => void;
  disabled?: boolean;
  className?: string;
}

const FileTypeIcon = ({ url }: { url: string }) => {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  const category = getFileCategory(url);

  switch (category) {
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

export function WorkInstructionFiles({
  workInstructionId,
  existingFiles,
  onFilesChange,
  disabled = false,
  className,
}: WorkInstructionFilesProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeMB = 10;
  const maxFiles = 20;

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || disabled) return;

      // In create mode (no workInstructionId), just show a message
      if (!workInstructionId) {
        alert("Guarda la instrucción de trabajo primero para poder subir archivos.");
        return;
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const filesToUpload: File[] = [];

      for (const file of Array.from(files)) {
        if (existingFiles.length + pendingUploads.length + filesToUpload.length >= maxFiles) {
          alert(`Máximo ${maxFiles} archivos permitidos`);
          break;
        }

        if (file.size > maxSizeBytes) {
          alert(`"${file.name}" excede el límite de ${maxSizeMB}MB`);
          continue;
        }

        filesToUpload.push(file);
      }

      // Upload each file
      for (const file of filesToUpload) {
        const id = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const category = getFileCategory(file);

        const pending: PendingUpload = {
          id,
          file,
          preview: category === "image" ? URL.createObjectURL(file) : undefined,
          progress: 0,
          status: "uploading",
        };

        setPendingUploads((prev) => [...prev, pending]);

        try {
          // Upload to Firebase Storage
          const url = await uploadFile(
            file,
            `work-instructions/${workInstructionId}`,
            (progress) => {
              setPendingUploads((prev) =>
                prev.map((p) =>
                  p.id === id ? { ...p, progress: progress.progress } : p
                )
              );
            }
          );

          // Save to backend
          setPendingUploads((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, status: "saving", progress: 100 } : p
            )
          );

          const result = await addWorkInstructionEvidence(workInstructionId, url);

          if (result.success && result.id) {
            // Add to existing files
            const newEvidence: IEvidence = {
              id: result.id,
              photo_url: url,
              comment: null,
            };
            onFilesChange([...existingFiles, newEvidence]);

            // Remove from pending
            setPendingUploads((prev) => prev.filter((p) => p.id !== id));
          } else {
            throw new Error(result.error || "Error saving to database");
          }
        } catch (error) {
          console.error("Upload error:", error);
          setPendingUploads((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status: "error",
                    error: error instanceof Error ? error.message : "Error al subir",
                  }
                : p
            )
          );
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [workInstructionId, existingFiles, onFilesChange, disabled, pendingUploads.length]
  );

  const handleDelete = useCallback(
    async (evidenceId: number) => {
      if (!workInstructionId || disabled) return;

      setDeletingIds((prev) => [...prev, evidenceId]);

      try {
        const result = await deleteWorkInstructionEvidence(workInstructionId, evidenceId);

        if (result.success) {
          onFilesChange(existingFiles.filter((f) => f.id !== evidenceId));
        } else {
          alert(result.error || "Error al eliminar archivo");
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Error al eliminar archivo");
      } finally {
        setDeletingIds((prev) => prev.filter((id) => id !== evidenceId));
      }
    },
    [workInstructionId, existingFiles, onFilesChange, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const removePendingUpload = (id: string) => {
    setPendingUploads((prev) => {
      const upload = prev.find((p) => p.id === id);
      if (upload?.preview) {
        URL.revokeObjectURL(upload.preview);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const isImage = (url: string) => {
    const category = getFileCategory(url);
    return category === "image";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Arrastra archivos o click para seleccionar
        </p>
        <p className="text-xs text-muted-foreground">
          Máximo {maxSizeMB}MB por archivo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Pending Uploads */}
      {pendingUploads.length > 0 && (
        <div className="space-y-2">
          {pendingUploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
            >
              {upload.preview ? (
                <img
                  src={upload.preview}
                  alt={upload.file.name}
                  className="h-8 w-8 object-cover rounded"
                />
              ) : (
                <FileTypeIcon url={upload.file.name} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{upload.file.name}</p>
                {upload.status === "uploading" && (
                  <Progress value={upload.progress} className="h-1 mt-1" />
                )}
                {upload.status === "saving" && (
                  <p className="text-xs text-muted-foreground">Guardando...</p>
                )}
                {upload.status === "error" && (
                  <p className="text-xs text-destructive">{upload.error}</p>
                )}
              </div>
              {upload.status === "uploading" || upload.status === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removePendingUpload(upload.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing Files Grid */}
      {existingFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {existingFiles.map((file) => (
            <div
              key={file.id}
              className="group relative border rounded-lg overflow-hidden bg-card"
            >
              {file.photo_url && isImage(file.photo_url) ? (
                <div className="aspect-video">
                  <img
                    src={file.photo_url}
                    alt={file.comment || "Archivo"}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center p-2 bg-muted/30">
                  <FileTypeIcon url={file.photo_url || ""} />
                  <p className="text-xs text-muted-foreground mt-1 text-center truncate max-w-full px-1">
                    {file.photo_url?.split("/").pop() || "Archivo"}
                  </p>
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => file.photo_url && window.open(file.photo_url, "_blank")}
                  title="Descargar"
                >
                  <Download className="h-3 w-3" />
                </Button>
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingIds.includes(file.id)}
                    title="Eliminar"
                  >
                    {deletingIds.includes(file.id) ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>

              {/* Comment footer */}
              {file.comment && (
                <div className="p-1 border-t text-xs text-muted-foreground truncate">
                  {file.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state message for create mode */}
      {!workInstructionId && existingFiles.length === 0 && pendingUploads.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Los archivos se pueden agregar después de guardar la instrucción de trabajo.
        </p>
      )}
    </div>
  );
}
