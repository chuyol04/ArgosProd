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
  const unassigned = incidents.filter((incident) => !incident.inspection_detail_serial_number_id);
  const rows = [];
  serialRows.forEach((serialLot, serialIndex) => {
    const assigned = serialLot
      ? incidents.filter((incident) => Number(incident.inspection_detail_serial_number_id) === Number(serialLot.id))
      : incidents;
    const defectRows = serialLot
      ? [...assigned, ...(serialIndex === 0 ? unassigned : [])]
      : assigned;
    (defectRows.length > 0 ? defectRows : [null]).forEach((incident, defectIndex) => {
      rows.push({
        serialLot,
        incident,
        carriesMetrics: defectIndex === 0,
        carriesHours: serialIndex === 0 && defectIndex === 0,
        serialIndex,
      });
    });
  });
  return rows;
}
