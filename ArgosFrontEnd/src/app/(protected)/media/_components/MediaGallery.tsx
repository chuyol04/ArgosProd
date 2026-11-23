"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
import { Button } from "@/components/ui/button";
import PageContainer from "@/components/layout/PageContainer";
import {
  CatalogEmptyState,
  CatalogPagination,
  CatalogSearch,
} from "@/components/common/CatalogPageElements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteMediaFiles } from "@/app/(protected)/media/actions/media.actions";
import { formatFileSize, mediaViewUrl, mediaDownloadUrl } from "@/lib/storage/fileUpload";
import { IMediaListResponse, IMediaFile } from "@/app/(protected)/media/types/media.types";
import {
  Trash2,
  Download,
  Eye,
  Loader2,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  CheckSquare,
  ImageOff,
} from "lucide-react";

interface MediaGalleryProps {
  initialData: IMediaListResponse;
  error?: string;
}

const MEDIA_PAGE_SIZES = [12, 20, 40, 60];

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

function isImage(contentType: string, filename?: string) {
  if (contentType?.startsWith("image/")) return true;
  const ext = filename?.split(".").pop()?.toLowerCase() || "";
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
}

function MediaThumbnail({ file, onOpen }: { file: IMediaFile; onOpen: () => void }) {
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");

  return (
    <button
      type="button"
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onOpen}
      aria-label={`Vista previa de ${file.filename}`}
    >
      {isImage(file.contentType, file.filename) && imageState !== "error" ? (
        <>
          <img
            src={mediaViewUrl(file._id)}
            alt={file.filename}
            className="h-full w-full object-cover"
            loading="lazy"
            onLoad={() => setImageState("ready")}
            onError={() => setImageState("error")}
          />
          {imageState === "loading" ? <span className="absolute inset-0 animate-pulse bg-muted" /> : null}
        </>
      ) : imageState === "error" ? (
        <span className="flex flex-col items-center gap-2 p-3 text-xs text-muted-foreground">
          <ImageOff className="h-8 w-8" aria-hidden="true" />
          No se pudo cargar
        </span>
      ) : (
        <FileTypeIcon contentType={file.contentType} filename={file.filename} />
      )}
    </button>
  );
}

export function MediaGallery({ initialData, error }: MediaGalleryProps) {
  const router = useRouter();
  const [qSearch] = useUrlString("search");
  const [urlLimit] = useUrlInt("limit", 20);
  const [urlPage, setQPage] = useUrlInt("page", 1);
  const setUrlParams = useUrlParams();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewFile, setPreviewFile] = useState<IMediaFile | null>(null);
  const [searchInput, setSearchInput] = useState(qSearch);
  const [operationError, setOperationError] = useState<string | null>(null);

  const files = initialData.files;
  const total = initialData.total;
  const currentPage = Math.max(urlPage, 1);
  const rowsPerPage = MEDIA_PAGE_SIZES.includes(urlLimit) ? urlLimit : 20;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

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
    setUrlParams({ search: searchInput || null, page: null });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    setOperationError(null);
    setIsDeleting(true);
    try {
      const result = await deleteMediaFiles(Array.from(selectedIds));
      if (result.deleted > 0) {
        setSelectedIds(new Set());
        setConfirmDelete(false);
        router.refresh();
      }
      if (result.errors.length > 0) {
        setOperationError(`No se eliminaron todos los archivos: ${result.errors.join(", ")}`);
      }
    } catch {
      setOperationError("No fue posible eliminar los archivos. Intenta nuevamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer className="max-w-6xl space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-balance text-foreground lg:text-3xl">
            Archivos y evidencias
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Consulta y administra los archivos almacenados. {total} archivo{total !== 1 ? "s" : ""} disponible{total !== 1 ? "s" : ""}.
          </p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar ({selectedIds.size})
          </Button>
        )}
      </div>

      {(error || operationError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          {operationError || `No fue posible cargar los archivos. ${error}`}
        </div>
      )}

      <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <CatalogSearch
          id="media-search"
          label="Buscar archivos"
          placeholder="Nombre de archivo"
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearch}
        />
        <div className="flex items-center">
          <Button
            variant="outline"
            className="min-h-11 w-full md:w-auto"
            onClick={toggleSelectAll}
            disabled={files.length === 0}
          >
            <CheckSquare className="mr-1.5 h-4 w-4" />
            {selectedIds.size === files.length && files.length > 0
              ? "Deseleccionar"
              : "Seleccionar todo"}
          </Button>
        </div>
      </div>

      {files.length === 0 ? (
        <CatalogEmptyState
          title={qSearch ? "Sin coincidencias" : "No hay archivos almacenados"}
          description={qSearch ? "Prueba con otro nombre de archivo." : "Los documentos y evidencias aparecerán aquí cuando se carguen desde los flujos operativos."}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {files.map((file) => {
            const selected = selectedIds.has(file._id);
            return (
              <article
                key={file._id}
                className={`relative overflow-hidden rounded-lg border bg-card transition-colors ${
                  selected ? "ring-2 ring-primary border-primary" : ""
                }`}
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    aria-label={`Seleccionar ${file.filename}`}
                    checked={selected}
                    onCheckedChange={() => toggleSelect(file._id)}
                    className="bg-background/80 backdrop-blur-sm"
                  />
                </div>

                <MediaThumbnail file={file} onOpen={() => setPreviewFile(file)} />

                <div className="space-y-2 border-t p-3">
                  <div className="space-y-0.5">
                    <p className="truncate text-xs font-medium" title={file.filename}>{file.filename}</p>
                    <div className="flex flex-col text-xs text-muted-foreground xl:flex-row xl:justify-between">
                      <span>{formatFileSize(file.length)}</span>
                      <span>{formatDate(file.uploadDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setPreviewFile(file)}
                    aria-label={`Vista previa de ${file.filename}`}
                    title="Vista previa"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    size="icon"
                    className="h-11 w-11"
                    title="Descargar"
                  >
                    <a href={mediaDownloadUrl(file._id)} download aria-label={`Descargar ${file.filename}`}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => {
                      setSelectedIds(new Set([file._id]));
                      setConfirmDelete(true);
                    }}
                    title="Eliminar"
                    aria-label={`Eliminar ${file.filename}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <CatalogPagination
            rowsPerPage={rowsPerPage}
            currentPage={currentPage}
            hasMore={currentPage < totalPages}
            onRowsPerPageChange={(value) => setUrlParams({ limit: Number(value), page: null })}
            onGoToPage={setQPage}
            total={total}
            pageSizeOptions={MEDIA_PAGE_SIZES}
          />
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
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
              <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p>Tipo: {previewFile.contentType}</p>
                  <p>Tamaño: {formatFileSize(previewFile.length)}</p>
                  <p>Fecha: {formatDate(previewFile.uploadDate)}</p>
                  <p className="break-all text-xs">ID: {previewFile._id}</p>
                </div>
                <a href={mediaDownloadUrl(previewFile._id)} download>
                  <Button variant="outline" className="min-h-11 w-full sm:w-auto">
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
            <DialogTitle>Confirmar eliminación</DialogTitle>
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
    </PageContainer>
  );
}
