"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Save, X, Trash2 } from "lucide-react";
import {
  IInspectionDetailExtended,
  IInspectionDetailFormData,
  IInspector,
  IReportOption,
} from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";
import {
  createInspectionDetail,
  updateInspectionDetail,
  deleteInspectionDetail,
  fetchInspectorsForSelect,
} from "@/app/(protected)/detalles-inspeccion/actions/detalles-inspeccion.actions";

type Mode = "view" | "edit" | "create";

interface InspectionDetailFormProps {
  detail?: IInspectionDetailExtended;
  inspectors: IInspector[];
  reports: IReportOption[];
  initialMode?: Mode;
  reportId?: number;
}

// Reusable field component for consistent styling
function FormField({
  label,
  value,
  isReadOnly,
  children,
  valueClassName = "",
}: {
  label: string;
  value?: string | number | null;
  isReadOnly: boolean;
  children?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {isReadOnly ? (
        <p className={`text-sm font-medium text-foreground ${valueClassName}`}>
          {value ?? "-"}
        </p>
      ) : (
        children
      )}
    </div>
  );
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

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "-";
  return timeStr;
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export default function InspectionDetailForm({
  detail,
  inspectors,
  reports,
  initialMode = "view",
  reportId,
}: InspectionDetailFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<IInspectionDetailFormData>({
    inspection_report_id: detail?.inspection_report_id || reportId || 0,
    serial_number: detail?.serial_number ?? "",
    lot_number: detail?.lot_number ?? "",
    inspector_id: detail?.inspector_id ?? undefined,
    hours: detail?.hours ?? undefined,
    week: detail?.week ?? undefined,
    inspection_date: toInputDate(detail?.inspection_date ?? null),
    manufacture_date: toInputDate(detail?.manufacture_date ?? null),
    comments: detail?.comments ?? "",
    inspected_pieces: detail?.inspected_pieces ?? undefined,
    accepted_pieces: detail?.accepted_pieces ?? undefined,
    rejected_pieces: detail?.rejected_pieces ?? undefined,
    reworked_pieces: detail?.reworked_pieces ?? undefined,
    start_time: detail?.start_time ?? "",
    end_time: detail?.end_time ?? "",
    shift: detail?.shift != null ? String(detail.shift) : "",
  });

  // State for filtered inspectors based on selected report's work instruction
  const [filteredInspectors, setFilteredInspectors] = useState<IInspector[]>(inspectors);
  const [isLoadingInspectors, setIsLoadingInspectors] = useState(false);

  // Fetch inspectors filtered by work instruction when report changes
  useEffect(() => {
    const selectedReportId = formData.inspection_report_id;
    if (!selectedReportId || selectedReportId === 0) {
      setFilteredInspectors(inspectors);
      return;
    }

    // Find the selected report to get its work_instruction_id
    const selectedReport = reports.find((r) => r.id === selectedReportId);
    if (!selectedReport?.work_instruction_id) {
      setFilteredInspectors(inspectors);
      return;
    }

    // Fetch inspectors for this work instruction
    setIsLoadingInspectors(true);
    fetchInspectorsForSelect(selectedReport.work_instruction_id)
      .then((data) => {
        setFilteredInspectors(data.length > 0 ? data : inspectors);
      })
      .catch(() => {
        setFilteredInspectors(inspectors);
      })
      .finally(() => {
        setIsLoadingInspectors(false);
      });
  }, [formData.inspection_report_id, reports, inspectors]);

  const isReadOnly = mode === "view";
  const isCreate = mode === "create";

  const handleInputChange = (
    field: keyof IInspectionDetailFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      if (isCreate) {
        if (!formData.inspection_report_id) {
          setError("Debe seleccionar un reporte de inspección");
          return;
        }
        const result = await createInspectionDetail(formData);
        if (result.success && result.id) {
          router.push(`/detalles-inspeccion/${result.id}`);
        } else {
          setError(result.error || "Error al crear detalle");
        }
      } else if (detail) {
        const result = await updateInspectionDetail(detail.id, formData);
        if (result.success) {
          setMode("view");
          router.refresh();
        } else {
          setError(result.error || "Error al actualizar detalle");
        }
      }
    });
  };

  const handleDelete = () => {
    if (!detail) return;
    if (!confirm("¿Estás seguro de que deseas eliminar este detalle de inspección?")) return;

    startTransition(async () => {
      const result = await deleteInspectionDetail(detail.id);
      if (result.success) {
        router.push("/reportes-inspeccion");
      } else {
        setError(result.error || "Error al eliminar detalle");
      }
    });
  };

  const handleCancel = () => {
    if (isCreate) {
      router.back();
    } else {
      setMode("view");
      setFormData({
        inspection_report_id: detail?.inspection_report_id || 0,
        serial_number: detail?.serial_number ?? "",
        lot_number: detail?.lot_number ?? "",
        inspector_id: detail?.inspector_id ?? undefined,
        hours: detail?.hours ?? undefined,
        week: detail?.week ?? undefined,
        inspection_date: toInputDate(detail?.inspection_date ?? null),
        manufacture_date: toInputDate(detail?.manufacture_date ?? null),
        comments: detail?.comments ?? "",
        inspected_pieces: detail?.inspected_pieces ?? undefined,
        accepted_pieces: detail?.accepted_pieces ?? undefined,
        rejected_pieces: detail?.rejected_pieces ?? undefined,
        reworked_pieces: detail?.reworked_pieces ?? undefined,
        start_time: detail?.start_time ?? "",
        end_time: detail?.end_time ?? "",
        shift: detail?.shift != null ? String(detail.shift) : "",
      });
    }
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-8 lg:px-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground lg:text-2xl">
              {isCreate
                ? "Crear Detalle de Inspección"
                : `Detalle #${detail?.id}`}
            </h1>
            {detail && (
              <p className="text-sm text-muted-foreground">
                {detail.part_name} - {detail.service_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isReadOnly && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar
              </Button>
            </>
          )}
          {!isReadOnly && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
                <X className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                <Save className="mr-1.5 h-4 w-4" />
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Context Info Card - View Only */}
      {detail && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Información del Reporte</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Pieza</p>
              <p className="text-sm font-medium">{detail.part_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Servicio</p>
              <p className="text-sm font-medium">{detail.service_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">{detail.client_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PO</p>
              <p className="text-sm font-medium">{detail.po_number || "-"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Selection - Only for Create */}
      {isCreate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reporte de Inspección</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={formData.inspection_report_id ? String(formData.inspection_report_id) : ""}
              onValueChange={(val) => handleInputChange("inspection_report_id", Number(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione un reporte" />
              </SelectTrigger>
              <SelectContent>
                {reports.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    No hay reportes
                  </SelectItem>
                ) : (
                  reports.map((report) => (
                    <SelectItem key={report.id} value={String(report.id)}>
                      #{report.id} - {report.part_name} ({report.service_name})
                      {report.po_number && ` - PO: ${report.po_number}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Identification Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Identificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Serial and Lot Number - Full Width */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <FormField label="Número de Serie" value={detail?.serial_number} isReadOnly={isReadOnly}>
              <Input
                value={formData.serial_number || ""}
                onChange={(e) => handleInputChange("serial_number", e.target.value)}
                placeholder="Ej: SN-001-ABCD-1234-XYZ"
                className="font-mono"
              />
            </FormField>

            <FormField label="Número de Lote" value={detail?.lot_number} isReadOnly={isReadOnly}>
              <Input
                value={formData.lot_number || ""}
                onChange={(e) => handleInputChange("lot_number", e.target.value)}
                placeholder="Ej: LOT-2024-001-ABCD"
                className="font-mono"
              />
            </FormField>
          </div>

          {/* Inspector and Shift */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <FormField label="Inspector" value={detail?.inspector_name} isReadOnly={isReadOnly}>
              <Select
                value={formData.inspector_id ? String(formData.inspector_id) : ""}
                onValueChange={(val) =>
                  handleInputChange("inspector_id", val ? Number(val) : undefined)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione inspector" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingInspectors ? (
                    <SelectItem value="_loading" disabled>
                      Cargando inspectores...
                    </SelectItem>
                  ) : filteredInspectors.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No hay inspectores asignados
                    </SelectItem>
                  ) : (
                    filteredInspectors.map((inspector) => (
                      <SelectItem key={inspector.id} value={String(inspector.id)}>
                        {inspector.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Turno" value={detail?.shift} isReadOnly={isReadOnly}>
              <Input
                value={formData.shift || ""}
                onChange={(e) => handleInputChange("shift", e.target.value)}
                placeholder="Ej: Turno 1, Matutino, etc."
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Dates and Times Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Fechas y Tiempos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Fecha de Inspección"
            value={formatDate(detail?.inspection_date || null)}
            isReadOnly={isReadOnly}
          >
            <Input
              type="date"
              value={formData.inspection_date || ""}
              onChange={(e) => handleInputChange("inspection_date", e.target.value)}
            />
          </FormField>

          <FormField
            label="Fecha de Manufactura"
            value={formatDate(detail?.manufacture_date || null)}
            isReadOnly={isReadOnly}
          >
            <Input
              type="date"
              value={formData.manufacture_date || ""}
              onChange={(e) => handleInputChange("manufacture_date", e.target.value)}
            />
          </FormField>

          <FormField label="Semana" value={detail?.week} isReadOnly={isReadOnly}>
            <Input
              type="number"
              min="1"
              value={formData.week ?? ""}
              onChange={(e) =>
                handleInputChange("week", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Ej: 1, 52, 104..."
            />
          </FormField>

          <FormField label="Horas Trabajadas" value={detail?.hours} isReadOnly={isReadOnly}>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={formData.hours ?? ""}
              onChange={(e) =>
                handleInputChange("hours", e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Ej: 8"
            />
          </FormField>

          <FormField
            label="Hora de Inicio"
            value={formatTime(detail?.start_time || null)}
            isReadOnly={isReadOnly}
          >
            <Input
              type="time"
              value={formData.start_time || ""}
              onChange={(e) => handleInputChange("start_time", e.target.value)}
            />
          </FormField>

          <FormField
            label="Hora de Fin"
            value={formatTime(detail?.end_time || null)}
            isReadOnly={isReadOnly}
          >
            <Input
              type="time"
              value={formData.end_time || ""}
              onChange={(e) => handleInputChange("end_time", e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Pieces Count Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Conteo de Piezas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <FormField
            label="Inspeccionadas"
            value={detail?.inspected_pieces}
            isReadOnly={isReadOnly}
            valueClassName="text-base"
          >
            <Input
              type="number"
              min="0"
              value={formData.inspected_pieces ?? ""}
              onChange={(e) =>
                handleInputChange(
                  "inspected_pieces",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="0"
            />
          </FormField>

          <FormField
            label="Aceptadas"
            value={detail?.accepted_pieces}
            isReadOnly={isReadOnly}
            valueClassName="text-base text-green-600"
          >
            <Input
              type="number"
              min="0"
              value={formData.accepted_pieces ?? ""}
              onChange={(e) =>
                handleInputChange(
                  "accepted_pieces",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="0"
            />
          </FormField>

          <FormField
            label="Rechazadas"
            value={detail?.rejected_pieces}
            isReadOnly={isReadOnly}
            valueClassName="text-base text-red-600"
          >
            <Input
              type="number"
              min="0"
              value={formData.rejected_pieces ?? ""}
              onChange={(e) =>
                handleInputChange(
                  "rejected_pieces",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="0"
            />
          </FormField>

          <FormField
            label="Retrabajadas"
            value={detail?.reworked_pieces}
            isReadOnly={isReadOnly}
            valueClassName="text-base text-yellow-600"
          >
            <Input
              type="number"
              min="0"
              value={formData.reworked_pieces ?? ""}
              onChange={(e) =>
                handleInputChange(
                  "reworked_pieces",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="0"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Comentarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isReadOnly ? (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {detail?.comments || "Sin comentarios"}
            </p>
          ) : (
            <Textarea
              placeholder="Comentarios adicionales..."
              value={formData.comments || ""}
              onChange={(e) => handleInputChange("comments", e.target.value)}
              rows={4}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
