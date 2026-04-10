"use client";

import { useState, useMemo, useCallback } from "react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  searchParser,
  limitParser,
  pageParser,
} from "@/app/(protected)/media/utils/parsers.client";
import { deleteMediaFiles } from "@/app/(protected)/media/actions/media.actions";
import { formatFileSize, mediaViewUrl, mediaDownloadUrl } from "@/lib/storage/fileUpload";
import { IMediaListResponse, IMediaFile } from "@/app/(protected)/media/types/media.types";
import {
  Search,
  Trash2,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Upload,
  X,
  CheckSquare,
} from "lucide-react";

interface MediaGalleryProps {
  initialData: IMediaListResponse;
  error?: string;
}

function FileTypeIcon({ contentType, filename }: { contentType: string; filename: string }) {
  if (contentType?.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-green-500" />;
  if (contentType === "application/pdf") return <FileText className="h-8 w-8 text-red-500" />;
  const ext = filename?.split(".").pop()?.toLowerCase() || "";
  if (["doc", "docx", "odt", "rtf", "txt"].includes(ext)) return <FileText className="h-8 w-8 text-blue-500" />;
  if (["xls", "xlsx", "csv", "ods"].includes(ext)) return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  return <FileIcon className="h-8 w-8 text-gray-500" />;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function MediaGallery({ initialData, error }: MediaGalleryProps) {
  const [qSearch, setQSearch] = useQueryState("search", searchParser);
  const [qLimit, setQLimit] = useQueryState("limit", limitParser);
  const [qPage, setQPage] = useQueryState("page", pageParser);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewFile, setPreviewFile] = useState<IMediaFile | null>(null);
  const [searchInput, setSearchInput] = useState(qSearch ?? "");

  const files = initialData.files;
  const total = initialData.total;
  const currentPage = qPage ?? 1;
  const rowsPerPage = qLimit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const isImage = (contentType: string, filename?: string) => {
    if (contentType?.startsWith("image/")) return true;
    const ext = filename?.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f._id)));
    }
  }, [files, selectedIds.size]);

  const handleSearch = () => {
    setQSearch(searchInput || "");
    setQPage(1);
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const result = await deleteMediaFiles(Array.from(selectedIds));
      if (result.deleted > 0) {
        setSelectedIds(new Set());
        setConfirmDelete(false);
        // Trigger re-fetch by resetting page
        setQPage(currentPage);
        window.location.reload();
      }
      if (result.errors.length > 0) {
        alert(`Errores al eliminar: ${result.errors.join(", ")}`);
      }
    } catch {
      alert("Error al eliminar archivos");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-8 lg:px-12 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground lg:text-2xl">
            Media
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} archivo{total !== 1 ? "s" : ""} almacenado{total !== 1 ? "s" : ""}
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar ({selectedIds.size})
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Buscar por nombre de archivo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-sm"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
          >
            <CheckSquare className="mr-1.5 h-4 w-4" />
            {selectedIds.size === files.length && files.length > 0
              ? "Deseleccionar"
              : "Seleccionar todo"}
          </Button>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(val) => {
              setQLimit(Number(val));
              setQPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="40">40</SelectItem>
              <SelectItem value="60">60</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Gallery Grid */}
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No hay archivos multimedia
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {files.map((file) => {
            const selected = selectedIds.has(file._id);
            return (
              <div
                key={file._id}
                className={`group relative rounded-lg border overflow-hidden bg-card transition-colors ${
                  selected ? "ring-2 ring-primary border-primary" : ""
                }`}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => toggleSelect(file._id)}
                    className="bg-background/80 backdrop-blur-sm"
                  />
                </div>

                {/* Thumbnail */}
                {isImage(file.contentType, file.filename) ? (
                  <div
                    className="aspect-square cursor-pointer"
                    onClick={() => setPreviewFile(file)}
                  >
                    <img
                      src={mediaViewUrl(file._id)}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div
                    className="aspect-square flex flex-col items-center justify-center bg-muted/30 cursor-pointer"
                    onClick={() => setPreviewFile(file)}
                  >
                    <FileTypeIcon contentType={file.contentType} filename={file.filename} />
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewFile(file)}
                    title="Vista previa"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <a href={mediaDownloadUrl(file._id)} download>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setSelectedIds(new Set([file._id]));
                      setConfirmDelete(true);
                    }}
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Info footer */}
                <div className="p-2 border-t space-y-0.5">
                  <p className="text-xs font-medium truncate" title={file.filename}>
                    {file.filename}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(file.length)}</span>
                    <span>{formatDate(file.uploadDate)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => setQPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => setQPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewFile?.filename}
            </DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-3">
              {isImage(previewFile.contentType, previewFile.filename) ? (
                <div className="flex justify-center">
                  <img
                    src={mediaViewUrl(previewFile._id)}
                    alt={previewFile.filename}
                    className="max-w-full max-h-[60vh] object-contain rounded"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
                  <FileTypeIcon contentType={previewFile.contentType} filename={previewFile.filename} />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Vista previa no disponible para este tipo de archivo
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="space-y-1">
                  <p>Tipo: {previewFile.contentType}</p>
                  <p>Tamaño: {formatFileSize(previewFile.length)}</p>
                  <p>Fecha: {formatDate(previewFile.uploadDate)}</p>
                  <p className="font-mono text-xs">ID: {previewFile._id}</p>
                </div>
                <a href={mediaDownloadUrl(previewFile._id)} download>
                  <Button variant="outline" size="sm">
                    <Download className="mr-1.5 h-4 w-4" />
                    Descargar
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar {selectedIds.size} archivo
            {selectedIds.size !== 1 ? "s" : ""}? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
