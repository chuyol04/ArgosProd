import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getInspectionReportDetails } from "@/app/(protected)/reportes-inspeccion/actions/reportes-inspeccion.actions";
import { fetchIncidentsByDetail, IIncident } from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";
import { IInspectionDetail } from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";
import PageContainer from "@/components/layout/PageContainer";
import { MediaItem } from "@/components/ui/media-item";
import { formatDateDisplay } from "@/lib/dateTimeUtils";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

const addCounts = (items: IInspectionDetail[]) => items.reduce((sum, item) => ({
  inspected: sum.inspected + Number(item.inspected_pieces || 0),
  accepted: sum.accepted + Number(item.accepted_pieces || 0),
  rejected: sum.rejected + Number(item.rejected_pieces || 0),
  reworked: sum.reworked + Number(item.reworked_pieces || 0),
}), { inspected: 0, accepted: 0, rejected: 0, reworked: 0 });

export default async function MisReporteDetallePage({ params }: Props) {
  const reportId = Number((await params).id);
  if (!Number.isInteger(reportId)) notFound();
  const result = await getInspectionReportDetails(reportId);
  if (!result.success || !result.data) notFound();

  const { report, inspections } = result.data;
  const incidentLists = await Promise.all(inspections.map((detail) => fetchIncidentsByDetail(detail.id)));
  const incidentsByDetail = new Map<number, IIncident[]>(inspections.map((detail, index) => [detail.id, incidentLists[index] || []]));
  const shiftGroups = Array.from(inspections.reduce((map, detail) => {
    const key = `${String(detail.inspection_date || "sin-fecha").slice(0, 10)}::${detail.shift || "Sin turno"}`;
    map.set(key, [...(map.get(key) || []), detail]);
    return map;
  }, new Map<string, IInspectionDetail[]>()).entries());
  const totals = addCounts(inspections);
  const totalBoxes = inspections.reduce((sum, detail) => sum + Math.max(detail.serial_numbers.length, 1), 0);

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/mis-reportes" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="text-xl font-bold lg:text-2xl">Reporte #{report.id}</h1>
          </div>
          <Link href={`/api/reports/${report.id}/export`} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Download className="mr-2 h-4 w-4" />Exportar Excel
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3">
          {[["Cliente", report.client_name], ["Servicio", report.service_name], ["Pieza", report.part_name], ["Fecha de Inicio", formatDateDisplay(report.start_date)], ["Número de PO", report.po_number || "-"], ["Modalidad", report.inspection_mode === "rate" ? "RATE" : "FULL TIME"]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>)}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {[[shiftGroups.length, "Turnos/día", ""], [totalBoxes, "Cajas", ""], [totals.inspected, "Inspeccionadas", ""], [totals.accepted, "Aceptadas", "text-green-600"], [totals.rejected, "Rechazadas", "text-red-600"], [totals.reworked, "Retrabajadas", "text-amber-600"]].map(([value, label, color]) => <div key={String(label)} className="rounded-lg border bg-card p-3 text-center"><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs uppercase text-muted-foreground">{label}</p></div>)}
        </div>

        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resultado por turno</h2>
          <div className="space-y-4">
            {shiftGroups.map(([groupKey, details]) => {
              const shift = details[0]?.shift || "Sin turno";
              const counts = addCounts(details);
              const denominator = Math.max(counts.inspected, counts.accepted + counts.rejected + counts.reworked, 1);
              return <div key={groupKey} className="space-y-2"><div className="flex justify-between text-sm"><strong>{formatDateDisplay(details[0]?.inspection_date ?? null)} · Turno {shift}</strong><span className="text-muted-foreground">{counts.inspected} inspeccionadas</span></div><div className="flex h-5 overflow-hidden rounded-full bg-muted" aria-label={`Turno ${shift}: ${counts.accepted} aceptadas, ${counts.rejected} rechazadas, ${counts.reworked} retrabajadas`}><div className="bg-green-500" style={{ width: `${counts.accepted / denominator * 100}%` }} /><div className="bg-red-500" style={{ width: `${counts.rejected / denominator * 100}%` }} /><div className="bg-amber-500" style={{ width: `${counts.reworked / denominator * 100}%` }} /></div><div className="flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="text-green-600">Aceptadas {counts.accepted}</span><span className="text-red-600">Rechazadas {counts.rejected}</span><span className="text-amber-600">Retrabajadas {counts.reworked}</span></div></div>;
            })}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Detalles por turno y día ({shiftGroups.length})</h2>
          {shiftGroups.length === 0 ? <p className="text-sm text-muted-foreground">Este reporte todavía no tiene inspecciones.</p> : shiftGroups.map(([groupKey, details]) => {
            const shift = details[0]?.shift || "Sin turno";
            const shiftCounts = addCounts(details);
            const rateHours = report.inspection_mode === "rate" && report.inspection_rate_per_hour ? shiftCounts.inspected / report.inspection_rate_per_hour : null;
            const shiftHours = rateHours ?? details.reduce((sum, item) => sum + Number(item.hours || 0), 0);
            return <div key={groupKey} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{formatDateDisplay(details[0]?.inspection_date ?? null)} · Turno {shift}</h3><p className="text-xs text-muted-foreground">{details.map((item) => item.inspector_name).filter(Boolean).filter((name, index, all) => all.indexOf(name) === index).join(", ") || "Sin inspector"}</p></div><p className="text-sm font-medium">{shiftHours.toFixed(2)} horas del día</p></div>
              <div className="space-y-2">
                {details.flatMap((detail) => {
                  const serials = detail.serial_numbers.length ? detail.serial_numbers : [{ id: 0, serial_number: "-", lot_number: detail.lot_number, inspected_pieces: detail.inspected_pieces, accepted_pieces: detail.accepted_pieces, rejected_pieces: detail.rejected_pieces, reworked_pieces: detail.reworked_pieces }];
                  const incidents = incidentsByDetail.get(detail.id) || [];
                  return serials.map((serial, serialIndex) => {
                    const boxIncidents = incidents.filter((incident) => incident.inspection_detail_serial_number_id === serial.id || (!incident.inspection_detail_serial_number_id && serialIndex === 0));
                    const legacyCounts = serial.inspected_pieces == null && serialIndex === 0;
                    const counts = legacyCounts ? {
                      inspected_pieces: detail.inspected_pieces,
                      accepted_pieces: detail.accepted_pieces,
                      rejected_pieces: detail.rejected_pieces,
                      reworked_pieces: detail.reworked_pieces,
                    } : serial;
                    return <div key={`${detail.id}-${serial.id}-${serialIndex}`} className="rounded-md border p-3">
                      <div className="grid gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Serie</p><p className="font-mono">{serial.serial_number}</p></div><div><p className="text-xs text-muted-foreground">Lote</p><p className="font-mono">{serial.lot_number || "-"}</p></div><div><p className="text-xs text-muted-foreground">Fecha inspección</p><p>{formatDateDisplay(detail.inspection_date)}</p></div><div><p className="text-xs text-muted-foreground">Fecha manufactura</p><p>{formatDateDisplay(detail.manufacture_date ?? null)}</p></div></div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><span>Inspeccionadas <b>{counts.inspected_pieces ?? 0}</b></span><span className="text-green-600">Aceptadas <b>{counts.accepted_pieces ?? 0}</b></span><span className="text-red-600">Rechazadas <b>{counts.rejected_pieces ?? 0}</b></span><span className="text-amber-600">Retrabajadas <b>{counts.reworked_pieces ?? 0}</b></span></div>
                      {boxIncidents.length > 0 && <div className="mt-3 space-y-2 border-t pt-3">{boxIncidents.map((incident) => <div key={incident.id} className="flex items-center gap-3 rounded-md bg-muted/40 p-2">{incident.evidence_url && /^[a-f0-9]{24}$/.test(incident.evidence_url) && <MediaItem mediaId={incident.evidence_url} size="sm" />}<p className="text-sm"><b>{incident.defect_name}</b> · {incident.quantity ?? 0}</p></div>)}</div>}
                    </div>;
                  });
                })}
              </div>
            </div>;
          })}
        </section>
      </div>
    </PageContainer>
  );
}
