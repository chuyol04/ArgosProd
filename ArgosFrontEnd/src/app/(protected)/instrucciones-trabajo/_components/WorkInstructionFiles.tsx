"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { uploadFile, getFileCategory, formatFileSize } from "@/lib/storage/fileUpload";
import { MediaItem } from "@/components/ui/media-item";
import {
  addWorkInstructionEvidence,
  deleteWorkInstructionEvidence,
  setMainWorkInstructionEvidence,
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
  Trash2,
  Star,
} from "lucide-react";

interface PendingUpload {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "uploading" | "saving" | "completed" | "error";
  error?: string;
  isMain: boolean;
}

interface WorkInstructionFilesProps {
  workInstructionId: number | null;
  existingFiles: IEvidence[];
  onFilesChange: (files: IEvidence[]) => void;
  disabled?: boolean;
  className?: string;
  /** Create mode only: the signed IT file picked before the record exists. */
  queuedMainFile?: File | null;
  onQueuedMainFileChange?: (file: File | null) => void;
  /** Create mode only: complementary documents picked before the record exists. */
  queuedComplementaryFiles?: File[];
  onQueuedComplementaryFilesChange?: (files: File[]) => void;
}

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "txt",
  "jpg", "jpeg", "png", "gif", "webp", "svg",
];

function isAllowedFileType(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_EXTENSIONS.includes(ext);
}

const FileTypeIcon = ({ name }: { name: string }) => {
  const category = getFileCategory(name);
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

const ACCEPT_ATTR = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt";
const MAX_SIZE_MB = 10;
const MAX_FILES = 20;

export function WorkInstructionFiles({
  workInstructionId,
  existingFiles,
  onFilesChange,
  disabled = false,
  className,
  queuedMainFile,
  onQueuedMainFileChange,
  queuedComplementaryFiles,
  onQueuedComplementaryFilesChange,
}: WorkInstructionFilesProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isDraggingMain, setIsDraggingMain] = useState(false);
  const [isDraggingComplementary, setIsDraggingComplementary] = useState(false);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [settingMainId, setSettingMainId] = useState<number | null>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const complementaryInputRef = useRef<HTMLInputElement>(null);

  // The signed IT is unique per work instruction; everything else is a complementary document.
  const mainEvidence = existingFiles.find((f) => f.is_main_it) || null;
  const complementaryEvidences = existingFiles.filter((f) => !f.is_main_it);
  const mainPendingUpload = pendingUploads.find((p) => p.isMain) || null;
  const complementaryPendingUploads = pendingUploads.filter((p) => !p.isMain);

  const validateFiles = useCallback((files: FileList, currentCount: number): File[] => {
    const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
    const valid: File[] = [];

    for (const file of Array.from(files)) {
      if (currentCount + valid.length >= MAX_FILES) {
        alert(`Máximo ${MAX_FILES} archivos permitidos`);
        break;
      }
      if (file.size > maxSizeBytes) {
        alert(`"${file.name}" excede el límite de ${MAX_SIZE_MB}MB`);
        continue;
      }
      if (!isAllowedFileType(file)) {
        alert(
          `"${file.name}" no es un tipo de archivo permitido. Se aceptan imágenes, PDF, Word, Excel o texto.`
        );
        continue;
      }
      valid.push(file);
    }
    return valid;
  }, []);

  const uploadAndLink = useCallback(
    async (file: File, isMain: boolean) => {
      if (!workInstructionId) return;

      const id = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const category = getFileCategory(file);

      const pending: PendingUpload = {
        id,
        file,
        preview: category === "image" ? URL.createObjectURL(file) : undefined,
        progress: 0,
        status: "uploading",
        isMain,
      };

      setPendingUploads((prev) => [...prev, pending]);

      try {
        const mediaId = await uploadFile(file, `work-instructions/${workInstructionId}`, (progress) => {
          setPendingUploads((prev) =>
            prev.map((p) => (p.id === id ? { ...p, progress: progress.progress } : p))
          );
        });

        setPendingUploads((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: "saving", progress: 100 } : p))
        );

        const result = await addWorkInstructionEvidence(workInstructionId, mediaId, undefined, isMain);

        if (result.success && result.id) {
          const newEvidence: IEvidence = {
            id: result.id,
            photo_url: mediaId,
            comment: null,
            is_main_it: isMain,
          };
          // Uploading a new main demotes whichever evidence was main before.
          const nextFiles = isMain
            ? existingFiles.map((f) => ({ ...f, is_main_it: false }))
            : existingFiles;
          onFilesChange([...nextFiles, newEvidence]);
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
    },
    [workInstructionId, existingFiles, onFilesChange]
  );

  const handleMainFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0 || disabled) return;
      const file = files[0]; // only one main IT file at a time

      const maxSizeBytes = MAX_SIZE_MB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        alert(`"${file.name}" excede el límite de ${MAX_SIZE_MB}MB`);
        return;
      }
      if (!isAllowedFileType(file)) {
        alert(
          `"${file.name}" no es un tipo de archivo permitido. Se aceptan imágenes, PDF, Word, Excel o texto.`
        );
        return;
      }

      if (!workInstructionId) {
        // Create mode: queue locally (replaces any previously queued main file).
        onQueuedMainFileChange?.(file);
      } else {
        uploadAndLink(file, true);
      }
      if (mainInputRef.current) mainInputRef.current.value = "";
    },
    [disabled, workInstructionId, onQueuedMainFileChange, uploadAndLink]
  );

  const handleComplementaryFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;

      const currentCount =
        complementaryEvidences.length +
        complementaryPendingUploads.length +
        (queuedComplementaryFiles?.length || 0);
      const validFiles = validateFiles(files, currentCount);

      if (validFiles.length === 0) {
        if (complementaryInputRef.current) complementaryInputRef.current.value = "";
        return;
      }

      if (!workInstructionId) {
        onQueuedComplementaryFilesChange?.([...(queuedComplementaryFiles || []), ...validFiles]);
      } else {
        validFiles.forEach((file) => uploadAndLink(file, false));
      }
      if (complementaryInputRef.current) complementaryInputRef.current.value = "";
    },
    [
      disabled,
      complementaryEvidences.length,
      complementaryPendingUploads.length,
      queuedComplementaryFiles,
      validateFiles,
      workInstructionId,
      onQueuedComplementaryFilesChange,
      uploadAndLink,
    ]
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

  // Reclassifies an already-uploaded complementary document as the main IT,
  // without re-uploading or deleting anything.
  const handleSetMain = useCallback(
    async (evidenceId: number) => {
      if (!workInstructionId || disabled) return;

      setSettingMainId(evidenceId);
      try {
        const result = await setMainWorkInstructionEvidence(workInstructionId, evidenceId);
        if (result.success) {
          onFilesChange(existingFiles.map((f) => ({ ...f, is_main_it: f.id === evidenceId })));
        } else {
          alert(result.error || "Error al marcar como IT principal");
        }
      } catch (error) {
        console.error("Set main evidence error:", error);
        alert("Error al marcar como IT principal");
      } finally {
        setSettingMainId(null);
      }
    },
    [workInstructionId, existingFiles, onFilesChange, disabled]
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

  const isMediaId = (value: string | null) => {
    if (!value) return false;
    return /^[a-f0-9]{24}$/.test(value);
  };

  const renderPendingUpload = (upload: PendingUpload) => (
    <div key={upload.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
      {upload.preview ? (
        <img src={upload.preview} alt={upload.file.name} className="h-8 w-8 object-cover rounded" />
      ) : (
        <FileTypeIcon name={upload.file.name} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{upload.file.name}</p>
        {upload.status === "uploading" && <Progress value={upload.progress} className="h-1 mt-1" />}
        {upload.status === "saving" && <p className="text-xs text-muted-foreground">Guardando...</p>}
        {upload.status === "error" && <p className="text-xs text-destructive">{upload.error}</p>}
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
  );

  const renderQueuedFile = (file: File, onRemove: () => void) => (
    <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
      <FileTypeIcon name={file.name} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)} · Se subirá al guardar</p>
      </div>
      {!disabled && (
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-5", className)}>
      {/* ---------- IT Principal (firmada) - una sola por instrucción de trabajo ---------- */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          IT Principal (firmada)
        </p>

        {mainEvidence ? (
          <div className="group relative border rounded-lg overflow-hidden bg-card">
            {mainEvidence.photo_url && isMediaId(mainEvidence.photo_url) ? (
              <MediaItem mediaId={mainEvidence.photo_url} label={mainEvidence.comment || undefined} size="md" />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center bg-muted/30">
                <FileTypeIcon name={mainEvidence.photo_url || ""} />
                <p className="text-xs text-muted-foreground mt-1 text-center truncate max-w-full px-1">
                  {mainEvidence.comment || "Archivo"}
                </p>
              </div>
            )}
            {!disabled && (
              <div className="absolute top-1 right-1 z-10 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    mainInputRef.current?.click();
                  }}
                  title="Reemplazar IT principal"
                >
                  <Upload className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(mainEvidence.id);
                  }}
                  disabled={deletingIds.includes(mainEvidence.id)}
                  title="Eliminar"
                >
                  {deletingIds.includes(mainEvidence.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : mainPendingUpload ? (
          renderPendingUpload(mainPendingUpload)
        ) : queuedMainFile ? (
          renderQueuedFile(queuedMainFile, () => onQueuedMainFileChange?.(null))
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingMain(false);
              handleMainFileSelect(e.dataTransfer.files);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingMain(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingMain(false);
            }}
            onClick={() => !disabled && mainInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
              isDraggingMain
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Sube la IT firmada (PDF o imagen)</p>
            <p className="text-xs text-muted-foreground">Máximo {MAX_SIZE_MB}MB</p>
          </div>
        )}

        <input
          ref={mainInputRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={(e) => handleMainFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* ---------- Documentos Complementarios - opcionales, pueden ser varios ---------- */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Documentos Complementarios (opcional)
        </p>

        <div
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingComplementary(false);
            handleComplementaryFileSelect(e.dataTransfer.files);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingComplementary(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDraggingComplementary(false);
          }}
          onClick={() => !disabled && complementaryInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDraggingComplementary
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Arrastra archivos o click para seleccionar</p>
          <p className="text-xs text-muted-foreground">Máximo {MAX_SIZE_MB}MB por archivo</p>
          <input
            ref={complementaryInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            onChange={(e) => handleComplementaryFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled}
          />
        </div>

        {complementaryPendingUploads.length > 0 && (
          <div className="space-y-2">{complementaryPendingUploads.map(renderPendingUpload)}</div>
        )}

        {queuedComplementaryFiles && queuedComplementaryFiles.length > 0 && (
          <div className="space-y-2">
            {queuedComplementaryFiles.map((file, index) =>
              renderQueuedFile(file, () =>
                onQueuedComplementaryFilesChange?.(
                  queuedComplementaryFiles.filter((_, i) => i !== index)
                )
              )
            )}
          </div>
        )}

        {complementaryEvidences.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {complementaryEvidences.map((file) => (
              <div key={file.id} className="group relative border rounded-lg overflow-hidden bg-card">
                {file.photo_url && isMediaId(file.photo_url) ? (
                  <MediaItem mediaId={file.photo_url} label={file.comment || undefined} size="md" />
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center bg-muted/30">
                    <FileTypeIcon name={file.photo_url || ""} />
                    <p className="text-xs text-muted-foreground mt-1 text-center truncate max-w-full px-1">
                      {file.comment || "Archivo"}
                    </p>
                  </div>
                )}

                {!disabled && (
                  <div className="absolute top-1 right-1 z-10 flex gap-1">
                    {!mainEvidence && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMain(file.id);
                        }}
                        disabled={settingMainId === file.id}
                        title="Marcar como IT principal"
                      >
                        {settingMainId === file.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Star className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      disabled={deletingIds.includes(file.id)}
                      title="Eliminar"
                    >
                      {deletingIds.includes(file.id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
