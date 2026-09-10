export function getExportHours(inspectionMode, inspectedPieces, rate, workedHours) {
  if (inspectionMode !== 'rate') return workedHours ?? null;
  if (inspectedPieces === null || inspectedPieces === undefined || inspectedPieces === '') return null;

  const pieces = Number(inspectedPieces);
  const piecesPerHour = Number(rate);
  if (!Number.isFinite(pieces) || !Number.isFinite(piecesPerHour) || piecesPerHour <= 0) {
    return null;
  }
  return pieces / piecesPerHour;
}

export function expandSerialAndDefectRows(serialLots = [], incidents = []) {
  const serialRows = serialLots.length > 0 ? serialLots : [null];
  const defectRows = incidents.length > 0 ? incidents : [null];
  const rowCount = Math.max(serialRows.length, defectRows.length);

  return Array.from({ length: rowCount }, (_, index) => ({
    serialLot: serialRows[index] ?? null,
    incident: defectRows[index] ?? null,
    carriesMetrics: index < defectRows.length,
  }));
}
