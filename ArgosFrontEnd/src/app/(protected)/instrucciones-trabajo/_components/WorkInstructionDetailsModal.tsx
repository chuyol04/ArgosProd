"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { RichTextViewer } from "@/components/ui/rich-text-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getWorkInstructionDetails } from "@/app/(protected)/instrucciones-trabajo/actions/instrucciones-trabajo.actions";
import { IWorkInstructionDetails } from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";
import { ImageIcon } from "lucide-react";

interface WorkInstructionDetailsModalProps {
  workInstructionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper component to render description content (HTML or legacy Markdown)
function DescriptionContent({ content }: { content: string }) {
  // Check if content looks like HTML (starts with < tag)
  const isHtml = content.trim().startsWith("<");

  if (isHtml) {
    // Render HTML content directly
    return <RichTextViewer content={content} />;
  }

  // Fall back to Markdown for legacy content
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function WorkInstructionDetailsModal({
  workInstructionId,
  open,
  onOpenChange,
}: WorkInstructionDetailsModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<IWorkInstructionDetails | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setDetails(null);
    }
  }, [open]);

  // Fetch work instruction details when modal opens
  useEffect(() => {
    if (open && workInstructionId) {
      setIsLoading(true);
      setError(null);
      getWorkInstructionDetails(workInstructionId)
        .then((result) => {
          if (result.success && result.data) {
            setDetails(result.data);
          } else {
            setError(result.error || "Error al cargar detalles");
          }
        })
        .catch(() => {
          setError("Error al cargar detalles");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, workInstructionId]);

  const handleGoToReports = () => {
    onOpenChange(false);
    router.push(`/reportes-inspeccion?work_instruction_id=${workInstructionId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[74vw] max-w-[74vw] max-h-[85vh] overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>Detalles de Instrucción de Trabajo</DialogTitle>
            <DialogDescription>
              {details?.instruction?.part_name || "Cargando..."} - {details?.instruction?.service_name || ""}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : details ? (
          <div className="grid grid-cols-2 gap-6 p-6 pt-4 h-[calc(85vh-100px)]">
            {/* Left Column - Description */}
            <div className="flex flex-col h-full">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Descripción</h3>
              <div className="flex-1 p-4 rounded-lg bg-muted/30 border overflow-y-auto">
                {details.instruction.description ? (
                  <DescriptionContent content={details.instruction.description} />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                )}
              </div>
            </div>

            {/* Right Column - All other content */}
            <div className="flex flex-col h-full overflow-y-auto space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Pieza</h3>
                  <p className="text-sm font-medium">{details.instruction.part_name}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Servicio</h3>
                  <p className="text-sm">{details.instruction.service_name}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Cliente</h3>
                  <p className="text-sm">{details.instruction.client_name}</p>
                  <p className="text-xs text-muted-foreground">{details.instruction.client_email}</p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Rate (Piezas/Hora)</h3>
                  <p className="text-sm font-medium">{details.instruction.inspection_rate_per_hour}</p>
                </div>
              </div>

              <Separator />

              {/* Photos */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Fotos ({details.evidences.length})
                </h3>
                {details.evidences.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {details.evidences.map((evidence) => (
                      <div
                        key={evidence.id}
                        className="aspect-square rounded-lg bg-muted flex items-center justify-center border border-dashed"
                      >
                        {evidence.photo_url ? (
                          <img
                            src={evidence.photo_url}
                            alt={evidence.comment || "Evidencia"}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 rounded-lg bg-muted/30 border border-dashed">
                    <ImageIcon className="h-6 w-6 text-muted-foreground mr-2" />
                    <p className="text-sm text-muted-foreground">No hay fotos asociadas</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Collaborators */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Colaboradores Asociados ({details.collaborators.length})
                </h3>
                {details.collaborators.length > 0 ? (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {details.collaborators.map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="text-sm font-medium">{collab.name}</p>
                          <p className="text-xs text-muted-foreground">{collab.email}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {collab.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay colaboradores asociados.</p>
                )}
              </div>

              <Separator />

              {/* Inspection Reports Table */}
              <div className="space-y-2 flex-1 min-h-0">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Reportes de Inspección ({details.reports.length})
                </h3>
                {details.reports.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden max-h-[150px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left text-xs font-medium text-muted-foreground">ID</th>
                          <th className="p-2 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                          <th className="p-2 text-left text-xs font-medium text-muted-foreground">PO</th>
                          <th className="p-2 text-left text-xs font-medium text-muted-foreground">Horas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.reports.map((report, index) => (
                          <tr
                            key={report.id}
                            className={index !== details.reports.length - 1 ? "border-b" : ""}
                          >
                            <td className="p-2">{report.id}</td>
                            <td className="p-2">{formatDate(report.start_date)}</td>
                            <td className="p-2">{report.po_number || "-"}</td>
                            <td className="p-2">{report.po_hours || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay reportes de inspección.</p>
                )}
                <Button onClick={handleGoToReports} variant="outline" size="sm" className="w-full">
                  Ir a Reportes de Inspección
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
