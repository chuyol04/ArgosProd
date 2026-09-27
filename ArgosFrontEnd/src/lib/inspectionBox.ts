import type { ISerialLotInput } from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";

export function boxDefectQuantity(box?: { rejected_pieces: number | null }): number | null {
  const quantity = box?.rejected_pieces;
  return typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 0
    ? quantity
    : null;
}

export function calculateAccepted(box: ISerialLotInput): ISerialLotInput {
  return { ...box, accepted_pieces: Math.max(0, box.inspected_pieces - box.rejected_pieces) };
}

export function validateInspectionBox(box: ISerialLotInput): string | null {
  if (!box.serial_number.trim() && !box.lot_number.trim()) return "Captura una serie o un lote.";
  if (box.serial_number.trim().length > 50 || box.lot_number.trim().length > 50) return "Serie y lote admiten hasta 50 caracteres.";
  if ([box.inspected_pieces, box.rejected_pieces, box.reworked_pieces].some(
    (count) => !Number.isInteger(count) || count < 0 || count > 2147483647
  )) return "Las cantidades deben ser enteros no negativos.";
  if (box.rejected_pieces > box.inspected_pieces) return "Rechazadas no puede superar inspeccionadas.";
  return null;
}

// Stable while adding/removing boxes, including several boxes from the same lot.
export function pendingBoxKey(box: ISerialLotInput): string {
  return box.client_id ?? JSON.stringify([box.serial_number, box.lot_number]);
}
