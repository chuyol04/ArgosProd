"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import {
  addSerialNumber,
  deleteSerialNumber,
} from "@/app/(protected)/detalles-inspeccion/actions/detalles-inspeccion.actions";
import {
  ISerialNumber,
  ISerialLotInput,
} from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";

export const MAX_SERIAL_NUMBERS = 20;

interface SerialNumbersInputProps {
  inspectionDetailId: number | null;
  disabled?: boolean;
  /** Validation message from the parent form (e.g. "must add at least one"). */
  error?: string;
  // Pending mode only (inspectionDetailId === null, i.e. create screen): the
  // box doesn't exist yet, so values are just plain strings owned by the
  // parent form - they get sent together with the rest of the create payload
  // in one request (no separate upload/commit step needed, unlike evidence
  // files elsewhere in this form).
  pendingValues?: ISerialLotInput[];
  onPendingValuesChange?: (values: ISerialLotInput[]) => void;
  // Saved mode only (existing detail): initial list fetched with it. Adds/
  // removes hit the backend immediately, same as the Defectos section.
  initialSerialNumbers?: ISerialNumber[];
  /** Reports the current item count up to the parent (needed in saved mode,
   * where the list itself lives in this component's state, so the parent
   * can still validate "at least one serial number" before allowing a save). */
  onCountChange?: (count: number) => void;
}

export function SerialNumbersInput({
  inspectionDetailId,
  disabled = false,
  error,
  pendingValues = [],
  onPendingValuesChange,
  initialSerialNumbers = [],
  onCountChange,
}: SerialNumbersInputProps) {
  const isPendingMode = inspectionDetailId == null;
  const [savedSerials, setSavedSerials] = useState<ISerialNumber[]>(initialSerialNumbers);
  const [inputValue, setInputValue] = useState("");
  const [lotValue, setLotValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedSerials(initialSerialNumbers);
  }, [initialSerialNumbers]);

  const items: { key: string; serialNumber: string; lotNumber: string }[] = isPendingMode
    ? pendingValues.map((v) => ({ key: v.serial_number, serialNumber: v.serial_number, lotNumber: v.lot_number }))
    : savedSerials.map((s) => ({ key: String(s.id), serialNumber: s.serial_number, lotNumber: s.lot_number || "Sin lote" }));

  useEffect(() => {
    if (!isPendingMode) onCountChange?.(savedSerials.length);
  }, [isPendingMode, savedSerials.length, onCountChange]);

  const handleAdd = async () => {
    const trimmed = inputValue.trim().toUpperCase();
    const trimmedLot = lotValue.trim().toUpperCase();
    setLocalError(null);
    if (!trimmed || !trimmedLot) {
      setLocalError("Escribe el número de serie y su lote.");
      return;
    }

    const existingLabels = items.map((i) => i.serialNumber);
    if (existingLabels.includes(trimmed)) {
      setLocalError("Este número de serie ya fue agregado.");
      return;
    }
    if (existingLabels.length >= MAX_SERIAL_NUMBERS) {
      setLocalError(`Se permite un máximo de ${MAX_SERIAL_NUMBERS} números de serie.`);
      return;
    }

    if (isPendingMode) {
      onPendingValuesChange?.([...pendingValues, { serial_number: trimmed, lot_number: trimmedLot }]);
      setInputValue("");
      setLotValue("");
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addSerialNumber(inspectionDetailId, trimmed, trimmedLot);
      if (result.success && result.id) {
        setSavedSerials((prev) => [
          ...prev,
          { id: result.id!, serial_number: result.serial_number || trimmed, lot_number: result.lot_number || trimmedLot },
        ]);
        setInputValue("");
        setLotValue("");
        inputRef.current?.focus();
      } else {
        setLocalError(result.error || "Error al agregar número de serie");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = async (item: { key: string; serialNumber: string; lotNumber: string }) => {
    if (isPendingMode) {
      onPendingValuesChange?.(pendingValues.filter((v) => v.serial_number !== item.serialNumber));
      return;
    }

    const serialId = Number(item.key);
    setIsSubmitting(true);
    try {
      const result = await deleteSerialNumber(inspectionDetailId!, serialId);
      if (result.success) {
        setSavedSerials((prev) => prev.filter((s) => s.id !== serialId));
      } else {
        alert(result.error || "Error al eliminar número de serie");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (localError) setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Número de serie..."
          disabled={disabled || isSubmitting}
          className="font-mono"
          aria-invalid={!!(error || localError)}
        />
        <Input
          value={lotValue}
          onChange={(e) => {
            setLotValue(e.target.value);
            if (localError) setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Lote correspondiente..."
          disabled={disabled || isSubmitting}
          className="font-mono"
          aria-invalid={!!(error || localError)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={disabled || isSubmitting || !inputValue.trim() || !lotValue.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {(error || localError) && <p className="text-xs text-destructive">{error || localError}</p>}

      <p className="text-xs text-muted-foreground">Pares serie/lote agregados: {items.length}</p>

      {items.length > 0 && (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
          {items.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-mono"
            >
              <span>{item.serialNumber}</span>
              <span className="text-muted-foreground">· Lote {item.lotNumber}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  disabled={isSubmitting}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
