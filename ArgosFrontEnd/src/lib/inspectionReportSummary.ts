import type { IInspectionDetail, IInspectionReport } from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";
import type { IIncident } from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";

export function groupInspectionsByShift(inspections: IInspectionDetail[]) {
  return Array.from(inspections.reduce((map, detail) => {
    const key = `${String(detail.inspection_date || "sin-fecha").slice(0, 10)}::${detail.shift || "Sin turno"}`;
    const group = map.get(key) || [];
    group.push(detail);
    map.set(key, group);
    return map;
  }, new Map<string, IInspectionDetail[]>()).entries());
}

export function summarizeInspectionDetails(
  details: IInspectionDetail[],
  incidents: IIncident[],
  report: Pick<IInspectionReport, "inspection_mode" | "inspection_rate_per_hour">,
) {
  // Detail totals already include their boxes; count each detail's hours once.
  const counts = details.reduce((sum, item) => ({
    inspected: sum.inspected + Number(item.inspected_pieces || 0),
    accepted: sum.accepted + Number(item.accepted_pieces || 0),
    rejected: sum.rejected + Number(item.rejected_pieces || 0),
    reworked: sum.reworked + Number(item.reworked_pieces || 0),
    hours: sum.hours + Number(item.hours || 0),
  }), { inspected: 0, accepted: 0, rejected: 0, reworked: 0, hours: 0 });
  if (report.inspection_mode === "rate" && report.inspection_rate_per_hour) {
    counts.hours = counts.inspected / report.inspection_rate_per_hour;
  }

  const defects = new Map<string, { name: string; quantity: number }>();
  for (const incident of incidents) {
    const name = (incident.defect_name || incident.defect_label || "Sin descripción").trim().replace(/\s+/g, " ");
    const key = name.toLocaleLowerCase("es");
    const existing = defects.get(key);
    defects.set(key, { name: existing?.name || name, quantity: (existing?.quantity || 0) + Number(incident.quantity || 0) });
  }
  return { ...counts, defects: Array.from(defects.values()) };
}
