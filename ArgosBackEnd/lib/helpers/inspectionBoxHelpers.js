export const MAX_SERIAL_NUMBERS = 20;
export const PIECE_FIELDS = ['inspected_pieces', 'accepted_pieces', 'rejected_pieces', 'reworked_pieces'];

function invalid(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

export function normalizePieceCounts(raw) {
  const counts = {};
  for (const field of ['inspected_pieces', 'rejected_pieces', 'reworked_pieces']) {
    const value = raw?.[field];
    const number = Number(value);
    if (!['number', 'string'].includes(typeof value) || String(value).trim() === '' ||
        !Number.isInteger(number) || number < 0 || number > 2147483647) {
      invalid('Las cantidades deben ser enteros no negativos.');
    }
    counts[field] = number;
  }
  if (counts.rejected_pieces > counts.inspected_pieces) {
    invalid('Rechazadas no puede superar inspeccionadas.');
  }
  counts.accepted_pieces = counts.inspected_pieces - counts.rejected_pieces;
  return counts;
}

export function normalizeInspectionBox(raw, fallbackLot = '') {
  const serial = raw?.serial_number ?? '';
  const lot = raw?.lot_number ?? fallbackLot;
  if (typeof serial !== 'string' || typeof lot !== 'string') invalid('Serie y lote deben ser texto.');
  const serial_number = serial.trim().toUpperCase();
  const lot_number = lot.trim().toUpperCase();
  if (!serial_number && !lot_number) invalid('Captura una serie o un lote.');
  if (serial_number.length > 50 || lot_number.length > 50) invalid('Serie y lote admiten hasta 50 caracteres.');
  return { serial_number, lot_number, ...normalizePieceCounts(raw) };
}

export function normalizeInspectionBoxes(raw, fallbackLot = '') {
  if (!Array.isArray(raw) || raw.length === 0) invalid('Agrega al menos una caja con serie o lote.');
  if (raw.length > MAX_SERIAL_NUMBERS) invalid(`Se permite un máximo de ${MAX_SERIAL_NUMBERS} cajas.`);
  const seen = new Set();
  return raw.map((item) => {
    const box = normalizeInspectionBox(item, fallbackLot);
    if (box.serial_number && seen.has(box.serial_number)) invalid('Este número de serie ya fue agregado.');
    if (box.serial_number) seen.add(box.serial_number);
    return box;
  });
}
