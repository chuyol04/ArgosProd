"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, X } from "lucide-react";
import { addSerialNumber, deleteSerialNumber, updateSerialNumber } from "@/app/(protected)/detalles-inspeccion/actions/detalles-inspeccion.actions";
import { ISerialNumber, ISerialLotInput } from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";
import { calculateAccepted, validateInspectionBox } from "@/lib/inspectionBox";

export const MAX_SERIAL_NUMBERS = 20;
const EMPTY_BOX: ISerialLotInput = { serial_number: "", lot_number: "", inspected_pieces: 0, accepted_pieces: 0, rejected_pieces: 0, reworked_pieces: 0 };
const COUNT_FIELDS = ["inspected_pieces", "accepted_pieces", "rejected_pieces", "reworked_pieces"] as const;
type CountTotals = Pick<ISerialLotInput, (typeof COUNT_FIELDS)[number]>;

interface Props {
  inspectionDetailId: number | null;
  disabled?: boolean;
  canDelete?: boolean;
  error?: string;
  pendingValues?: ISerialLotInput[];
  onPendingValuesChange?: (values: ISerialLotInput[]) => void;
  initialSerialNumbers?: ISerialNumber[];
  onCountChange?: (count: number) => void;
  onTotalsChange?: (totals: CountTotals) => void;
  onSerialsChange?: (serials: ISerialNumber[]) => void;
}

function toEditable(value: ISerialNumber): ISerialLotInput {
  return {
    serial_number: value.serial_number || "",
    lot_number: value.lot_number || "",
    inspected_pieces: value.inspected_pieces ?? 0,
    accepted_pieces: value.accepted_pieces ?? 0,
    rejected_pieces: value.rejected_pieces ?? 0,
    reworked_pieces: value.reworked_pieces ?? 0,
  };
}

const labels = {
  serial_number: "Serie",
  lot_number: "Lote",
  inspected_pieces: "Inspeccionadas",
  accepted_pieces: "Aceptadas (automáticas)",
  rejected_pieces: "Rechazadas",
  reworked_pieces: "Retrabajadas",
};

export function SerialNumbersInput({ inspectionDetailId, disabled = false, canDelete = false, error, pendingValues = [], onPendingValuesChange, initialSerialNumbers = [], onCountChange, onTotalsChange, onSerialsChange }: Props) {
  const pendingMode = inspectionDetailId == null;
  const [draft, setDraft] = useState<ISerialLotInput>(EMPTY_BOX);
  const [saved, setSaved] = useState<ISerialNumber[]>(initialSerialNumbers);
  const [edits, setEdits] = useState<Record<number, ISerialLotInput>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const boxes = useMemo(
    () => pendingMode ? pendingValues : saved.map(toEditable),
    [pendingMode, pendingValues, saved]
  );

  useEffect(() => {
    if (pendingMode) return;
    setSaved(initialSerialNumbers);
    setEdits(Object.fromEntries(initialSerialNumbers.map((item) => [item.id, toEditable(item)])));
  }, [initialSerialNumbers, pendingMode]);

  useEffect(() => {
    onCountChange?.(boxes.length);
    const hasCompleteCounts = pendingMode || saved.every((box) => COUNT_FIELDS.every((field) => box[field] != null));
    if (hasCompleteCounts) {
      const totals = COUNT_FIELDS.reduce((result, field) => {
        result[field] = boxes.reduce((sum, box) => sum + Number(box[field] || 0), 0);
        return result;
      }, {} as CountTotals);
      onTotalsChange?.(totals);
    }
    if (!pendingMode) onSerialsChange?.(saved);
  }, [boxes, pendingMode, saved, onCountChange, onTotalsChange, onSerialsChange]);

  const setValue = (field: keyof ISerialLotInput, raw: string) => {
    const isCount = COUNT_FIELDS.includes(field as (typeof COUNT_FIELDS)[number]);
    setLocalError(null);
    setDraft((current) => calculateAccepted({ ...current, [field]: isCount ? (raw === "" ? NaN : Number(raw)) : raw }));
  };

  const addBox = async () => {
    const value = calculateAccepted({ ...draft, serial_number: draft.serial_number.trim().toUpperCase(), lot_number: draft.lot_number.trim().toUpperCase() });
    const validationError = validateInspectionBox(value);
    if (validationError) return setLocalError(validationError);
    if (value.serial_number && boxes.some((box) => box.serial_number === value.serial_number)) return setLocalError("Este número de serie ya fue agregado.");
    if (boxes.length >= MAX_SERIAL_NUMBERS) return setLocalError(`Se permite un máximo de ${MAX_SERIAL_NUMBERS} cajas.`);
    if (pendingMode) onPendingValuesChange?.([...pendingValues, { ...value, client_id: crypto.randomUUID() }]);
    else {
      setBusyId("new");
      const result = await addSerialNumber(inspectionDetailId, value);
      setBusyId(null);
      if (!result.success || !result.data) return setLocalError(result.error || "No se pudo agregar la caja.");
      setSaved((current) => [...current, result.data!]);
    }
    setDraft(EMPTY_BOX);
  };

  const removeBox = async (index: number) => {
    if (pendingMode) return onPendingValuesChange?.(pendingValues.filter((_, itemIndex) => itemIndex !== index));
    const item = saved[index];
    if (!item || !canDelete) return;
    setBusyId(item.id);
    const result = await deleteSerialNumber(inspectionDetailId!, item.id);
    setBusyId(null);
    if (result.success) setSaved((current) => current.filter((row) => row.id !== item.id));
    else setLocalError(result.error || "No se pudo eliminar la caja.");
  };

  const saveBox = async (item: ISerialNumber) => {
    const value = calculateAccepted(edits[item.id] || toEditable(item));
    const validationError = validateInspectionBox(value);
    if (validationError) return setLocalError(validationError);
    setLocalError(null);
    setBusyId(item.id);
    const result = await updateSerialNumber(inspectionDetailId!, item.id, value);
    setBusyId(null);
    if (result.success && result.data) setSaved((current) => current.map((row) => row.id === item.id ? result.data! : row));
    else setLocalError(result.error || "No se pudo actualizar la caja.");
  };

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input aria-label="Número de serie" maxLength={50} value={draft.serial_number} onChange={(event) => setValue("serial_number", event.target.value)} placeholder="Número de serie" className="font-mono" />
            <Input aria-label="Número de lote" maxLength={50} value={draft.lot_number} onChange={(event) => setValue("lot_number", event.target.value)} placeholder="Número de lote" className="font-mono" />
          </div>
          <p className="text-xs text-muted-foreground">Captura al menos una serie o un lote. Aceptadas = inspeccionadas − rechazadas.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COUNT_FIELDS.map((field) => <label key={field} className="text-xs text-muted-foreground">{labels[field]}<Input type="number" min="0" step="1" max={field === "rejected_pieces" && Number.isFinite(draft.inspected_pieces) ? draft.inspected_pieces : 2147483647} readOnly={field === "accepted_pieces"} value={Number.isFinite(draft[field]) ? draft[field] : ""} onChange={(event) => setValue(field, event.target.value)} className="mt-1 read-only:bg-muted" /></label>)}
          </div>
          <Button type="button" variant="outline" onClick={addBox} disabled={busyId !== null}><Plus className="mr-1 h-4 w-4" />Agregar caja</Button>
        </div>
      )}

      {(error || localError) && <p role="alert" className="text-xs text-destructive">{localError || error}</p>}
      <p className="text-xs text-muted-foreground">Cajas con serie o lote agregadas: {boxes.length}</p>

      <div className="space-y-2">
        {boxes.map((box, index) => {
          const persisted = pendingMode ? null : saved[index];
          const editable = persisted ? edits[persisted.id] || toEditable(persisted) : box;
          const value = disabled ? editable : calculateAccepted(editable);
          return (
            <div key={persisted?.id ?? `${box.serial_number}-${index}`} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between"><strong className="text-sm">Caja {index + 1}</strong>{!disabled && (pendingMode || canDelete) && <Button type="button" variant="ghost" size="icon" onClick={() => removeBox(index)} disabled={busyId !== null}><X className="h-4 w-4" /></Button>}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                {(["serial_number", "lot_number", ...COUNT_FIELDS] as const).map((field) => {
                  const isCount = COUNT_FIELDS.includes(field as (typeof COUNT_FIELDS)[number]);
                  return <label key={field} className="text-xs text-muted-foreground">{labels[field]}<Input type={isCount ? "number" : "text"} min={isCount ? 0 : undefined} step={isCount ? 1 : undefined} max={field === "rejected_pieces" && Number.isFinite(value.inspected_pieces) ? value.inspected_pieces : isCount ? 2147483647 : undefined} maxLength={isCount ? undefined : 50} readOnly={field === "accepted_pieces"} value={isCount && !Number.isFinite(value[field]) ? "" : value[field]} disabled={disabled || pendingMode} onChange={(event) => persisted && setEdits((current) => ({ ...current, [persisted.id]: calculateAccepted({ ...value, [field]: isCount ? (event.target.value === "" ? NaN : Number(event.target.value)) : event.target.value }) }))} className="mt-1 read-only:bg-muted" /></label>;
                })}
              </div>
              {persisted && !disabled && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => saveBox(persisted)} disabled={busyId !== null}><Save className="mr-1 h-3.5 w-3.5" />Guardar caja</Button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
