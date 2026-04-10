"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mediaViewUrl, mediaDownloadUrl, formatFileSize } from "@/lib/storage/fileUpload";
import {
  File as FileIcon,
  Download,
  Eye,
} from "lucide-react";

interface MediaFileInfo {
  _id: string;
  filename: string;
  contentType: string;
}

interface MediaItemProps {
  mediaId: string;
  /** Fallback label if filename can't be fetched */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

function isImageByName(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTS.includes(ext);
}

function isImageByType(contentType: string): boolean {
  return IMAGE_CONTENT_TYPES.some((t) => contentType.startsWith(t.split("/")[0] + "/"));
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-full aspect-video",
  lg: "w-full aspect-square",
};

/**
 * Reusable media thumbnail + preview component.
 * Fetches file info from MongoDB, shows thumbnail with filename,
 * and opens a full preview dialog on click.
 */
export function MediaItem({
  mediaId,
  label,
  size = "md",
  className = "",
}: MediaItemProps) {
  const [info, setInfo] = useState<MediaFileInfo | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!mediaId || !/^[a-f0-9]{24}$/.test(mediaId)) return;

    fetch("/api/media/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_ids: [mediaId] }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setInfo(data[0]);
        }
      })
      .catch(() => {});
  }, [mediaId]);

  const filename = info?.filename || label || "Archivo";
  const contentType = info?.contentType || "application/octet-stream";
  const isImage = info
    ? isImageByType(contentType) || isImageByName(info.filename)
    : false;
  const viewUrl = mediaViewUrl(mediaId);
  const dlUrl = mediaDownloadUrl(mediaId);

  return (
    <>
      {/* Thumbnail */}
      <div
        className={`group relative rounded-lg border overflow-hidden bg-muted/30 cursor-pointer ${sizeClasses[size]} ${className}`}
        onClick={() => setPreviewOpen(true)}
      >
        {!imgFailed ? (
          <>
            <img
              src={viewUrl}
              alt={filename}
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
            <FileIcon className="h-6 w-6 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground text-center truncate max-w-full leading-tight px-1">
              {filename}
            </p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{filename}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isImage && !imgFailed ? (
              <div className="flex justify-center">
                <img
                  src={viewUrl}
                  alt={filename}
                  className="max-w-full max-h-[60vh] object-contain rounded"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
                <FileIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Vista previa no disponible para este tipo de archivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">{contentType}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{filename}</p>
                <p className="text-xs">{contentType}</p>
                <p className="font-mono text-xs">ID: {mediaId}</p>
              </div>
              <a href={dlUrl} download>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-4 w-4" />
                  Descargar
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Batch-fetches info for multiple media IDs in one request.
 * Returns a map of id -> MediaFileInfo.
 */
export async function fetchMediaInfoBatch(
  mediaIds: string[]
): Promise<Map<string, MediaFileInfo>> {
  const map = new Map<string, MediaFileInfo>();
  if (mediaIds.length === 0) return map;

  try {
    const res = await fetch("/api/media/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_ids: mediaIds }),
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      for (const file of data) {
        map.set(file._id, file);
      }
    }
  } catch {}
  return map;
}
