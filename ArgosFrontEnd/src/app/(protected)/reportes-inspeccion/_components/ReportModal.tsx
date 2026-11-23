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
import { Loader2, Plus, Download, ArrowRight, ClipboardCheck } from "lucide-react";
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
import { toDateInputValue, formatDateDisplay } from "@/lib/dateTimeUtils";

type ModalMode = "create" | "edit" | "view";

interface ReportModalProps {
  reportId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
}

const formatDate = formatDateDisplay;

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
            setStartDate(toDateInputValue(report.start_date));
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

  const handleWorkInstructionChange = (value: string) => {
    const workInstruction = workInstructions.find((wi) => String(wi.id) === value);
    setWorkInstructionId(value);
    setStartDate(toDateInputValue(workInstruction?.start_date));
    setProblem(workInstruction?.problem || "");
  };

  const handleSubmit = () => {
    setError(null);
    if (!workInstructionId || !startDate) {
      setError("Selecciona una instrucción de trabajo y una fecha de inicio.");
      return;
    }

    startTransition(async () => {
      const data = {
        work_instruction_id: Number(workInstructionId),
        start_date: startDate,
        problem: problem || undefined,
      };

      if (isEditMode && reportId) {
        const result = await updateInspectionReport(reportId, data);
        if (result.success) onOpenChange(false);
        else setError(result.error || "No fue posible guardar los cambios.");
        return;
      }

      const result = await createInspectionReport(data);
      if (result.success && result.id) {
        onOpenChange(false);
        router.push(`/detalles-inspeccion/crear?report_id=${result.id}`);
      } else setError(result.error || "No fue posible crear el reporte.");
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

  const handleExportToExcel = () => {
    if (!reportId) return;
    // Open the export endpoint in a new tab - browser will download the file
    window.open(`/api/reports/${reportId}/export`, "_blank");
  };

  const getTitle = () => {
    switch (mode) {
      case "create":
        return "Nuevo reporte de inspección";
      case "edit":
        return "Editar reporte de inspección";
      case "view":
        return "Reporte de inspección";
    }
  };

  const report = reportDetails?.report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[90vw] max-w-[600px] flex-col overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>
              {isCreateMode ? "Paso 1 de 2: define el reporte y continúa con la captura del detalle." : report ? `Reporte #${report.id} · ${report.client_name}` : "Consulta y administra el reporte de inspección."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16" role="status">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="sr-only">Cargando reporte</span>
          </div>
        ) : error ? (
          <div className="mx-6 my-4 rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">{error}</div>
        ) : (
          <div className="min-h-0 overflow-y-auto overscroll-contain p-6 pt-4">
            <div className="space-y-4">
              {isCreateMode && (
                <div className="border-border bg-muted/30 flex items-start gap-3 rounded-lg border p-4">
                  <ClipboardCheck className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Primero crea el reporte</p>
                    <p className="text-muted-foreground mt-1 text-sm">Al guardarlo te llevaremos directamente a capturar cajas, cantidades y defectos.</p>
                  </div>
                </div>
              )}
              {/* Form Fields / View Fields */}
              {isViewMode && report ? (
                // View Mode - Read Only
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Label htmlFor="workInstruction">Instrucción de trabajo *</Label>
                    <Select value={workInstructionId} onValueChange={handleWorkInstructionChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona una instrucción..." />
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

              {/* Inspection details - shown for edit and view modes */}
              {!isCreateMode && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">Capturas del reporte</p>
                        <p className="text-muted-foreground text-xs">{inspectionDetails.length === 1 ? "1 detalle registrado" : `${inspectionDetails.length} detalles registrados`}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCreateInspectionDetail}><Plus className="mr-1.5 h-4 w-4" />Capturar detalle</Button>
                    </div>

                    {inspectionDetails.length === 0 ? (
                      <div className="border-border bg-muted/20 rounded-lg border border-dashed p-5 text-center">
                        <p className="text-sm font-medium">Este reporte aún no tiene capturas</p>
                        <p className="text-muted-foreground mt-1 text-sm">Agrega el primer detalle para registrar cajas, piezas y defectos.</p>
                        <Button className="mt-4" size="sm" onClick={handleCreateInspectionDetail}>Capturar primer detalle<ArrowRight className="ml-2 h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                        {inspectionDetails.map((detail) => (
                          <button key={detail.id} type="button" className="border-border bg-card hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none" onClick={() => handleViewInspectionDetail(detail.id)}>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Detalle #{detail.id}</p>
                              <p className="text-muted-foreground mt-0.5 truncate text-xs">{detail.serial_numbers.length > 0 ? `${detail.serial_numbers.length} caja(s) · ${detail.inspector_name}` : `Sin cajas · ${detail.inspector_name}`}</p>
                              <p className="text-muted-foreground mt-0.5 text-xs">{formatDate(detail.inspection_date)} · Turno {detail.shift || "-"}</p>
                            </div>
                            <span className="text-primary flex shrink-0 items-center gap-1 text-xs font-medium">Abrir<ArrowRight className="h-4 w-4" /></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isViewMode ? "Cerrar" : "Cancelar"}
          </Button>
          {isViewMode && reportId && (
            <Button variant="outline" onClick={handleExportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          )}
          {isViewMode && reportId && (
            <Button onClick={handleCreateInspectionDetail}>Capturar detalle<ArrowRight className="ml-2 h-4 w-4" /></Button>
          )}
          {!isViewMode && (
            <Button onClick={handleSubmit} disabled={isPending || loading} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEditMode ? (
                "Guardar cambios"
              ) : (
                <>Crear y capturar detalle<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
