"use client";

import { useState, useTransition, useEffect, useMemo, useRef } from "react";
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
import { ArrowLeft, Pencil, Save, X, Trash2, AlertTriangle } from "lucide-react";
import { useUser } from "@/contexts/users/userContext";
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
import { DefectsSection, DefectsSectionHandle } from "./DefectsSection";
import {
  toDateInputValue,
  toTimeInputValue,
  formatDateDisplay,
  formatTimeDisplay,
  isPastLocalDate,
  emptyToUndefined,
  calculateWorkedHours,
  isInvalidTimeRange,
  isValidTimeFormat,
} from "@/lib/dateTimeUtils";

type Mode = "view" | "edit" | "create";

// Fields that must be filled before saving, in the same top-to-bottom order
// they appear in the form - used to jump to the first one that fails.
type RequiredField =
  | "serial_number"
  | "lot_number"
  | "inspector_id"
  | "shift"
  | "inspection_date"
  | "manufacture_date"
  | "start_time"
  | "end_time";

const REQUIRED_FIELD_ORDER: RequiredField[] = [
  "serial_number",
  "lot_number",
  "inspector_id",
  "shift",
  "inspection_date",
  "manufacture_date",
  "start_time",
  "end_time",
];

function validateFormData(
  data: IInspectionDetailFormData
): Partial<Record<RequiredField, string>> {
  const errors: Partial<Record<RequiredField, string>> = {};
  const REQUIRED_MESSAGE = "Este campo es obligatorio.";

  if (!data.serial_number?.trim()) errors.serial_number = REQUIRED_MESSAGE;
  if (!data.lot_number?.trim()) errors.lot_number = REQUIRED_MESSAGE;
  if (!data.inspector_id) errors.inspector_id = REQUIRED_MESSAGE;

  if (!data.shift) {
    errors.shift = REQUIRED_MESSAGE;
  } else if (!/^\d+$/.test(data.shift)) {
    errors.shift = "Ingresa un número de turno válido.";
  }

  if (!data.inspection_date) errors.inspection_date = REQUIRED_MESSAGE;

  if (!data.manufacture_date) {
    errors.manufacture_date = REQUIRED_MESSAGE;
  } else if (data.inspection_date && data.manufacture_date > data.inspection_date) {
    errors.manufacture_date =
      "La fecha de manufactura no puede ser posterior a la fecha de inspección.";
  }

  if (!data.start_time) {
    errors.start_time = REQUIRED_MESSAGE;
  } else if (!isValidTimeFormat(data.start_time)) {
    errors.start_time = "Formato de hora inválido.";
  }

  if (!data.end_time) {
    errors.end_time = REQUIRED_MESSAGE;
  } else if (!isValidTimeFormat(data.end_time)) {
    errors.end_time = "Formato de hora inválido.";
  } else if (
    data.start_time &&
    isValidTimeFormat(data.start_time) &&
    isInvalidTimeRange(data.start_time, data.end_time)
  ) {
    errors.end_time = "La hora de fin debe ser posterior a la hora de inicio.";
  }

  return errors;
}

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
  error,
  fieldRef,
}: {
  label: string;
  value?: string | number | null;
  isReadOnly: boolean;
  children?: React.ReactNode;
  valueClassName?: string;
  error?: string;
  fieldRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={fieldRef} className="space-y-1.5">
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
      {!isReadOnly && error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const formatDate = formatDateDisplay;
const formatTime = formatTimeDisplay;
const toInputDate = toDateInputValue;

export default function InspectionDetailForm({
  detail,
  inspectors,
  reports,
  initialMode = "view",
  reportId,
}: InspectionDetailFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const defectsSectionRef = useRef<DefectsSectionHandle>(null);

  // Required-field validation: errors are computed continuously but only
  // shown once the user leaves that field (touched) or tries to save.
  const [touched, setTouched] = useState<Partial<Record<RequiredField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const fieldRefs = useRef<Partial<Record<RequiredField, HTMLDivElement | null>>>({});
  const setFieldRef = (field: RequiredField) => (el: HTMLDivElement | null) => {
    fieldRefs.current[field] = el;
  };
  const handleBlurField = (field: RequiredField) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  // Role-based permissions
  const isManagerOrAbove = useMemo(() => {
    return user?.roles?.some((r) => r === "Manager" || r === "Admin") ?? false;
  }, [user?.roles]);

  // Check if inspection is from a past date
  const isPastInspection = useMemo(() => {
    return isPastLocalDate(detail?.inspection_date);
  }, [detail?.inspection_date]);

  // Can edit: M+A always, Inspectors only same-day
  const canEdit = isManagerOrAbove || !isPastInspection;
  // Can delete: M+A only
  const canDelete = isManagerOrAbove;

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
    start_time: toTimeInputValue(detail?.start_time ?? null),
    end_time: toTimeInputValue(detail?.end_time ?? null),
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

  // Accepted/rejected/reworked are the only manually-captured piece counts -
  // never let them go negative.
  const handlePieceCountChange = (
    field: "accepted_pieces" | "rejected_pieces" | "reworked_pieces",
    rawValue: string
  ) => {
    handleInputChange(field, rawValue ? Math.max(0, Number(rawValue)) : undefined);
  };

  // Worked hours = end_time - start_time for THIS inspector's own entry only
  // (never summed across inspectors, never multiplied by headcount). Always
  // derived while editing/creating - the field itself stays read-only.
  const computedHours = useMemo(
    () => calculateWorkedHours(formData.start_time, formData.end_time),
    [formData.start_time, formData.end_time]
  );

  const fieldErrors = useMemo(() => validateFormData(formData), [formData]);
  const showError = (field: RequiredField) =>
    touched[field] || submitAttempted ? fieldErrors[field] : undefined;

  useEffect(() => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, hours: computedHours ?? undefined }));
  }, [computedHours, isReadOnly]);

  // Inspected pieces = accepted + rejected + reworked, for THIS box only
  // (never summed across boxes). The field itself stays read-only/computed.
  const computedInspectedPieces = useMemo(
    () =>
      (formData.accepted_pieces || 0) +
      (formData.rejected_pieces || 0) +
      (formData.reworked_pieces || 0),
    [formData.accepted_pieces, formData.rejected_pieces, formData.reworked_pieces]
  );

  useEffect(() => {
    if (isReadOnly) return;
    setFormData((prev) => ({ ...prev, inspected_pieces: computedInspectedPieces }));
  }, [computedInspectedPieces, isReadOnly]);

  // "Rate de Inspección": horas TEÓRICAS que debería tomar la caja según el
  // rate (piezas/hora) configurado en la instrucción de trabajo, distinto de
  // "Horas Trabajadas" (horas REALES por hora_inicio/hora_fin). Se recalcula
  // solo cuando cambian las piezas inspeccionadas o el rate de la instrucción.
  const inspectionRate = detail?.inspection_rate_per_hour ?? null;
  const estimatedHoursByRate = useMemo(() => {
    if (inspectionRate == null || inspectionRate === 0) return null;
    return Math.round((computedInspectedPieces / inspectionRate) * 100) / 100;
  }, [computedInspectedPieces, inspectionRate]);

  // "Problema / Condición Revisada": inherited from the parent report - what
  // is being inspected/looked for (e.g. "Golpe / Falta de ranura"). For an
  // existing detail it comes from the join (report_problem); while creating,
  // it's looked up from the currently-selected report in the dropdown.
  const reportProblem = useMemo(() => {
    if (detail) return detail.report_problem;
    return reports.find((r) => r.id === formData.inspection_report_id)?.problem ?? null;
  }, [detail, reports, formData.inspection_report_id]);

  // Sum of defect quantities reported by DefectsSection, compared against
  // rejected pieces - shown as a non-blocking visual warning when they differ.
  const [defectsTotalQuantity, setDefectsTotalQuantity] = useState(0);
  const rejectedPieces = formData.rejected_pieces || 0;
  const defectsMismatch =
    (rejectedPieces > 0 || defectsTotalQuantity > 0) && defectsTotalQuantity !== rejectedPieces;

  const handleSave = () => {
    setError(null);

    const errors = validateFormData(formData);
    if (Object.keys(errors).length > 0) {
      setSubmitAttempted(true);
      const firstErrorField = REQUIRED_FIELD_ORDER.find((f) => errors[f]);
      if (firstErrorField) {
        const el = fieldRefs.current[firstErrorField];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector<HTMLElement>("input, button, select, textarea")?.focus();
      }
      return;
    }

    // Empty date/time inputs must be sent as `undefined` (omit field on update,
    // null on create), never as "" - the DATE/TIME columns reject empty strings.
    const payload: IInspectionDetailFormData = {
      ...formData,
      inspection_date: emptyToUndefined(formData.inspection_date),
      manufacture_date: emptyToUndefined(formData.manufacture_date),
      start_time: emptyToUndefined(formData.start_time),
      end_time: emptyToUndefined(formData.end_time),
    };

    startTransition(async () => {
      if (isCreate) {
        if (!payload.inspection_report_id) {
          setError("Debe seleccionar un reporte de inspección");
          return;
        }
        const result = await createInspectionDetail(payload);
        if (result.success && result.id) {
          const failedDefects = await defectsSectionRef.current?.commitPendingDefects(
            result.id
          );
          if (failedDefects && failedDefects.length > 0) {
            alert(
              `El detalle se creó, pero no se pudieron guardar estos defectos: ${failedDefects.join(", ")}. Puedes agregarlos de nuevo desde la pantalla del detalle.`
            );
          }
          router.push(`/detalles-inspeccion/${result.id}`);
        } else {
          setError(result.error || "Error al crear detalle");
        }
      } else if (detail) {
        const result = await updateInspectionDetail(detail.id, payload);
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
        start_time: toTimeInputValue(detail?.start_time ?? null),
        end_time: toTimeInputValue(detail?.end_time ?? null),
        shift: detail?.shift != null ? String(detail.shift) : "",
      });
    }
    setError(null);
    setTouched({});
    setSubmitAttempted(false);
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
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTouched({});
                    setSubmitAttempted(false);
                    setMode("edit");
                  }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Editar
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Eliminar
                </Button>
              )}
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

      {/* Problema / Condición Revisada - what's being inspected/looked for in
          this box, inherited read-only from the parent report. Not the same
          as a "Defecto" (what was actually found), captured further below. */}
      {reportProblem && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
          <CardContent className="py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Problema / Condición Revisada
            </p>
            <p className="mt-1 text-sm font-medium whitespace-pre-wrap text-amber-900 dark:text-amber-100">
              {reportProblem}
            </p>
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
            <FormField
              label="Número de Serie *"
              value={detail?.serial_number}
              isReadOnly={isReadOnly}
              error={showError("serial_number")}
              fieldRef={setFieldRef("serial_number")}
            >
              <Input
                value={formData.serial_number || ""}
                onChange={(e) => handleInputChange("serial_number", e.target.value)}
                onBlur={() => handleBlurField("serial_number")}
                placeholder="Ej: SN-001-ABCD-1234-XYZ"
                className="font-mono"
                aria-invalid={!!showError("serial_number")}
              />
            </FormField>

            <FormField
              label="Número de Lote *"
              value={detail?.lot_number}
              isReadOnly={isReadOnly}
              error={showError("lot_number")}
              fieldRef={setFieldRef("lot_number")}
            >
              <Input
                value={formData.lot_number || ""}
                onChange={(e) => handleInputChange("lot_number", e.target.value)}
                onBlur={() => handleBlurField("lot_number")}
                placeholder="Ej: LOT-2024-001-ABCD"
                className="font-mono"
                aria-invalid={!!showError("lot_number")}
              />
            </FormField>
          </div>

          {/* Inspector and Shift */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <FormField
              label="Inspector *"
              value={detail?.inspector_name}
              isReadOnly={isReadOnly}
              error={showError("inspector_id")}
              fieldRef={setFieldRef("inspector_id")}
            >
              <Select
                value={formData.inspector_id ? String(formData.inspector_id) : ""}
                onValueChange={(val) => {
                  handleInputChange("inspector_id", val ? Number(val) : undefined);
                  handleBlurField("inspector_id");
                }}
              >
                <SelectTrigger
                  className="w-full"
                  onBlur={() => handleBlurField("inspector_id")}
                  aria-invalid={!!showError("inspector_id")}
                >
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

            <FormField
              label="Turno *"
              value={detail?.shift}
              isReadOnly={isReadOnly}
              error={showError("shift")}
              fieldRef={setFieldRef("shift")}
            >
              <Input
                type="number"
                min="0"
                inputMode="numeric"
                value={formData.shift || ""}
                onChange={(e) => handleInputChange("shift", e.target.value.replace(/\D/g, ""))}
                onBlur={() => handleBlurField("shift")}
                placeholder="Ej: 1, 2, 3"
                aria-invalid={!!showError("shift")}
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
            label="Fecha de Inspección *"
            value={formatDate(detail?.inspection_date || null)}
            isReadOnly={isReadOnly}
            error={showError("inspection_date")}
            fieldRef={setFieldRef("inspection_date")}
          >
            <Input
              type="date"
              value={formData.inspection_date || ""}
              onChange={(e) => handleInputChange("inspection_date", e.target.value)}
              onBlur={() => handleBlurField("inspection_date")}
              aria-invalid={!!showError("inspection_date")}
            />
          </FormField>

          <FormField
            label="Fecha de Manufactura *"
            value={formatDate(detail?.manufacture_date || null)}
            isReadOnly={isReadOnly}
            error={showError("manufacture_date")}
            fieldRef={setFieldRef("manufacture_date")}
          >
            <Input
              type="date"
              value={formData.manufacture_date || ""}
              onChange={(e) => handleInputChange("manufacture_date", e.target.value)}
              onBlur={() => handleBlurField("manufacture_date")}
              aria-invalid={!!showError("manufacture_date")}
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

          <FormField
            label="Hora de Inicio *"
            value={formatTime(detail?.start_time || null)}
            isReadOnly={isReadOnly}
            error={showError("start_time")}
            fieldRef={setFieldRef("start_time")}
          >
            <Input
              type="time"
              step={60}
              lang="es-MX"
              value={formData.start_time || ""}
              onChange={(e) => handleInputChange("start_time", e.target.value)}
              onBlur={() => handleBlurField("start_time")}
              aria-invalid={!!showError("start_time")}
            />
          </FormField>

          <FormField
            label="Hora de Fin *"
            value={formatTime(detail?.end_time || null)}
            isReadOnly={isReadOnly}
            error={showError("end_time")}
            fieldRef={setFieldRef("end_time")}
          >
            <Input
              type="time"
              step={60}
              lang="es-MX"
              value={formData.end_time || ""}
              onChange={(e) => handleInputChange("end_time", e.target.value)}
              onBlur={() => handleBlurField("end_time")}
              aria-invalid={!!showError("end_time")}
            />
          </FormField>

          {/* Horas Trabajadas: siempre de solo lectura, calculada automáticamente
              como hora_fin - hora_inicio para este inspector (no se suma ni se
              multiplica por colaboradores). */}
          <FormField label="Horas Trabajadas" value={detail?.hours} isReadOnly={isReadOnly}>
            <Input
              type="text"
              value={computedHours ?? ""}
              readOnly
              disabled
              placeholder="Se calcula con hora inicio/fin"
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
            label="Aceptadas"
            value={detail?.accepted_pieces}
            isReadOnly={isReadOnly}
            valueClassName="text-base text-green-600"
          >
            <Input
              type="number"
              min="0"
              value={formData.accepted_pieces ?? ""}
              onChange={(e) => handlePieceCountChange("accepted_pieces", e.target.value)}
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
              onChange={(e) => handlePieceCountChange("rejected_pieces", e.target.value)}
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
                handlePieceCountChange("reworked_pieces", e.target.value)
              }
              placeholder="0"
            />
          </FormField>

          <FormField
            label="Inspeccionadas"
            value={detail?.inspected_pieces}
            isReadOnly={isReadOnly}
            valueClassName="text-base"
          >
            <Input
              type="text"
              value={computedInspectedPieces}
              readOnly
              disabled
              placeholder="Acept. + Rech. + Retrab."
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Rate de Inspección: horas TEÓRICAS esperadas según el rate (piezas/hora)
          configurado en la instrucción de trabajo de esta pieza/servicio. No debe
          confundirse con "Horas Trabajadas" (horas reales de hora_inicio/hora_fin). */}
      {detail && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rate de Inspección</CardTitle>
          </CardHeader>
          <CardContent>
            {inspectionRate == null ? (
              <p className="text-sm text-muted-foreground">Rate no configurado</p>
            ) : inspectionRate === 0 ? (
              <p className="text-sm text-muted-foreground">Rate no válido</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Rate Establecido
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {inspectionRate} piezas por hora
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Piezas Inspeccionadas
                  </p>
                  <p className="text-sm font-medium text-foreground">{computedInspectedPieces}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Horas Estimadas por Rate
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {(estimatedHoursByRate ?? 0).toFixed(2)} horas
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Defects Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Defectos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {defectsMismatch && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                La suma de los defectos ({defectsTotalQuantity}) no coincide con las piezas
                rechazadas ({rejectedPieces}). Revisa las cantidades.
              </p>
            </div>
          )}
          <DefectsSection
            ref={defectsSectionRef}
            inspectionDetailId={detail?.id ?? null}
            disabled={isReadOnly || !canEdit}
            onTotalQuantityChange={setDefectsTotalQuantity}
          />
        </CardContent>
      </Card>
    </div>
  );
}
