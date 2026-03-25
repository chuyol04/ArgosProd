"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Eye, Plus } from "lucide-react";
import {
  IWorkInstructionOption,
  IInspectionDetail,
  IInspectionReportDetails,
} from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";
import {
  fetchWorkInstructionsForSelect,
  getInspectionReportDetails,
  createInspectionReport,
  updateInspectionReport,
} from "@/app/(protected)/reportes-inspeccion/actions/reportes-inspeccion.actions";

type ModalMode = "create" | "edit" | "view";

interface ReportModalProps {
  reportId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ReportModal({
  reportId,
  open,
  onOpenChange,
  mode,
}: ReportModalProps) {
  const router = useRouter();
  const isViewMode = mode === "view";
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";

  // Form state
  const [workInstructionId, setWorkInstructionId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poHours, setPoHours] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");

  // Data state
  const [workInstructions, setWorkInstructions] = useState<IWorkInstructionOption[]>([]);
  const [inspectionDetails, setInspectionDetails] = useState<IInspectionDetail[]>([]);
  const [reportDetails, setReportDetails] = useState<IInspectionReportDetails | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset form
  const resetForm = () => {
    setWorkInstructionId("");
    setStartDate("");
    setPoNumber("");
    setPoHours("");
    setDescription("");
    setProblem("");
    setInspectionDetails([]);
    setReportDetails(null);
    setError(null);
  };

  // Load work instructions for dropdown (only for create/edit modes)
  useEffect(() => {
    if (open && !isViewMode) {
      fetchWorkInstructionsForSelect().then(setWorkInstructions);
    }
  }, [open, isViewMode]);

  // Load report data when editing or viewing
  useEffect(() => {
    if (open && reportId && !isCreateMode) {
      setLoading(true);
      setError(null);
      getInspectionReportDetails(reportId)
        .then((result) => {
          if (result.success && result.data) {
            const { report, inspections } = result.data;
            setReportDetails(result.data);
            setWorkInstructionId(String(report.work_instruction_id));
            setStartDate(report.start_date?.split("T")[0] || "");
            setPoNumber(report.po_number || "");
            setPoHours(report.po_hours ? String(report.po_hours) : "");
            setDescription(report.description || "");
            setProblem(report.problem || "");
            setInspectionDetails(inspections || []);
          } else {
            setError(result.error || "Error al cargar detalles");
          }
        })
        .catch(() => {
          setError("Error al cargar detalles");
        })
        .finally(() => setLoading(false));
    } else if (open && isCreateMode) {
      resetForm();
    }
  }, [open, reportId, isCreateMode]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleSubmit = () => {
    if (!workInstructionId || !startDate) {
      alert("IT Asociado y Fecha de inicio son requeridos");
      return;
    }

    startTransition(async () => {
      const data = {
        work_instruction_id: Number(workInstructionId),
        start_date: startDate,
        po_number: poNumber || undefined,
        po_hours: poHours ? Number(poHours) : undefined,
        description: description || undefined,
        problem: problem || undefined,
      };

      let result;
      if (isEditMode && reportId) {
        result = await updateInspectionReport(reportId, data);
      } else {
        result = await createInspectionReport(data);
      }

      if (result.success) {
        onOpenChange(false);
      } else {
        alert(result.error || "Error al guardar el reporte");
      }
    });
  };

  const handleViewInspectionDetail = (detailId: number) => {
    onOpenChange(false);
    router.push(`/detalles-inspeccion/${detailId}`);
  };

  const handleCreateInspectionDetail = () => {
    onOpenChange(false);
    router.push(`/detalles-inspeccion/crear?report_id=${reportId}`);
  };

  const getTitle = () => {
    switch (mode) {
      case "create":
        return "Crear Reporte de Inspección";
      case "edit":
        return "Editar Reporte de Inspección";
      case "view":
        return "Detalles de Reporte de Inspección";
    }
  };

  const report = reportDetails?.report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[90vw] max-w-[600px] overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            {!isCreateMode && report && (
              <DialogDescription>Reporte #{report.id}</DialogDescription>
            )}
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-destructive">{error}</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto p-6 pt-4">
            <div className="space-y-4">
              {/* Form Fields / View Fields */}
              {isViewMode && report ? (
                // View Mode - Read Only
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      IT Asociado
                    </p>
                    <p className="text-sm font-medium">
                      IT #{report.work_instruction_id} - {report.part_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fecha de Inicio
                    </p>
                    <p className="text-sm font-medium">{formatDate(report.start_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Servicio
                    </p>
                    <p className="text-sm font-medium">{report.service_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cliente
                    </p>
                    <p className="text-sm font-medium">{report.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Número de PO
                    </p>
                    <p className="text-sm font-medium">{report.po_number || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Horas de PO
                    </p>
                    <p className="text-sm font-medium">{report.po_hours || "-"}</p>
                  </div>
                  {report.description && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Descripción
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{report.description}</p>
                    </div>
                  )}
                  {report.problem && (
                    <div className="space-y-1 col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Problema
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{report.problem}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Create/Edit Mode - Editable
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="workInstruction">IT Asociado *</Label>
                    <Select value={workInstructionId} onValueChange={setWorkInstructionId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar IT..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workInstructions.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            No hay instrucciones de trabajo
                          </SelectItem>
                        ) : (
                          workInstructions.map((wi) => (
                            <SelectItem key={wi.id} value={String(wi.id)}>
                              IT #{wi.id} - {wi.part_name} ({wi.client_name})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha de Inicio *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poNumber">Número de PO</Label>
                    <Input
                      id="poNumber"
                      placeholder="Ej: PO-12345"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poHours">Horas de PO</Label>
                    <Input
                      id="poHours"
                      type="number"
                      step="0.01"
                      placeholder="Ej: 8.5"
                      value={poHours}
                      onChange={(e) => setPoHours(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      placeholder="Descripción del reporte..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="problem">Problema</Label>
                    <Textarea
                      id="problem"
                      placeholder="Descripción del problema (si aplica)..."
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              {/* Inspection Details Table - shown for edit and view modes */}
              {!isCreateMode && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Detalles de Inspección
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {inspectionDetails.length} registro(s)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateInspectionDetail}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Crear
                        </Button>
                      </div>
                    </div>

                    {inspectionDetails.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay detalles de inspección asociados a este reporte.
                      </p>
                    ) : (
                      <div className="border-border overflow-hidden rounded-lg border">
                        <div className="overflow-x-auto max-h-[200px]">
                          <table className="w-full text-sm">
                            <thead className="bg-muted sticky top-0">
                              <tr>
                                <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                                  ID
                                </th>
                                <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                                  # Pieza
                                </th>
                                <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                                  Fecha
                                </th>
                                <th className="text-muted-foreground px-4 py-2 text-left text-xs font-medium">
                                  Turno
                                </th>
                                <th className="text-muted-foreground px-4 py-2 text-center text-xs font-medium">
                                  Ver
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-card">
                              {inspectionDetails.map((detail, index) => (
                                <tr
                                  key={detail.id}
                                  className={
                                    index !== inspectionDetails.length - 1
                                      ? "border-border border-b"
                                      : ""
                                  }
                                >
                                  <td className="text-card-foreground px-4 py-2 text-xs">
                                    {detail.id}
                                  </td>
                                  <td className="text-card-foreground px-4 py-2 text-xs">
                                    {detail.serial_number || detail.lot_number || "-"}
                                  </td>
                                  <td className="text-card-foreground px-4 py-2 text-xs">
                                    {formatDate(detail.inspection_date)}
                                  </td>
                                  <td className="text-card-foreground px-4 py-2 text-xs">
                                    {detail.shift || "-"}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleViewInspectionDetail(detail.id)}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Create mode message */}
              {isCreateMode && (
                <p className="text-muted-foreground text-sm">
                  Los detalles de inspección se pueden agregar después de crear el reporte.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isViewMode ? "Cerrar" : "Cancelar"}
          </Button>
          {!isViewMode && (
            <Button onClick={handleSubmit} disabled={isPending || loading}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEditMode ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
