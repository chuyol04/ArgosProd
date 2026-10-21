import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, ImageIcon, MessageSquare } from "lucide-react";
import { getInspectionReportDetails } from "@/app/(protected)/reportes-inspeccion/actions/reportes-inspeccion.actions";
import { fetchIncidentsByDetail, IIncident } from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";
import PageContainer from "@/components/layout/PageContainer";
import { MediaItem } from "@/components/ui/media-item";
import { formatDateDisplay } from "@/lib/dateTimeUtils";
import { groupInspectionsByShift, summarizeInspectionDetails } from "@/lib/inspectionReportSummary";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

function AttachmentPreview({ mediaId, label }: { mediaId: string; label: string }) {
  if (/^[a-f0-9]{24}$/i.test(mediaId)) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <MediaItem mediaId={mediaId} label={label} size="md" />
        <p className="break-words text-sm font-medium">{label}</p>
      </div>
    );
  }

  if (/^https?:\/\//i.test(mediaId)) {
    return (
      <a
        href={mediaId}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4 text-sm font-medium hover:bg-muted/40"
      >
        <span className="break-words">{label}</span>
        <ExternalLink className="h-4 w-4 shrink-0" />
      </a>
    );
  }

  return null;
}

export default async function MisReporteDetallePage({ params }: Props) {
  const reportId = Number((await params).id);
  if (!Number.isInteger(reportId)) notFound();
  const result = await getInspectionReportDetails(reportId);
  if (!result.success || !result.data) notFound();

  const { report, inspections, documents = [] } = result.data;
  const incidentLists = await Promise.all(inspections.map((detail) => fetchIncidentsByDetail(detail.id)));
  const incidentsByDetail = new Map<number, IIncident[]>(inspections.map((detail, index) => [detail.id, incidentLists[index] || []]));
  const shiftGroups = groupInspectionsByShift(inspections);
  const totals = summarizeInspectionDetails(inspections, [], report);
  const totalBoxes = inspections.reduce((sum, detail) => sum + Math.max(detail.serial_numbers.length, 1), 0);
  const outcomeTotal = totals.accepted + totals.rejected + totals.reworked;
  const chartTotal = Math.max(totals.inspected, outcomeTotal, 1);
  const unclassified = Math.max(chartTotal - outcomeTotal, 0);
  const resultSegments = [
    { label: "Aceptadas", value: totals.accepted, color: "#22c55e", textClass: "text-green-600" },
    { label: "Rechazadas", value: totals.rejected, color: "#ef4444", textClass: "text-red-600" },
    { label: "Retrabajadas", value: totals.reworked, color: "#f59e0b", textClass: "text-amber-600" },
    ...(unclassified > 0 ? [{ label: "Sin clasificar", value: unclassified, color: "#d1d5db", textClass: "text-muted-foreground" }] : []),
  ];
  let segmentStart = 0;
  const chartBackground = outcomeTotal || totals.inspected
    ? `conic-gradient(${resultSegments.map((segment) => {
        const segmentEnd = segmentStart + (segment.value / chartTotal) * 100;
        const stop = `${segment.color} ${segmentStart}% ${segmentEnd}%`;
        segmentStart = segmentEnd;
        return stop;
      }).join(", ")})`
    : "#e5e7eb";
  const generalAttachments = [
    ...(report.photo_url ? [{ id: `report-${report.id}`, mediaId: report.photo_url, label: "Evidencia general del reporte" }] : []),
    ...documents
      .filter((document) => Boolean(document.photo_url))
      .map((document) => ({
        id: `document-${document.id}`,
        mediaId: document.photo_url as string,
        label: document.comment?.trim()
          || (document.is_main_it ? "Instrucción de trabajo principal" : "Documento de la instrucción de trabajo"),
      })),
  ];

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
          {[["Cliente", report.client_name], ["Servicio", report.service_name], ["Pieza", report.part_name], ["Fecha de Inicio", formatDateDisplay(report.start_date)], ["Modalidad", report.inspection_mode === "rate" ? "RATE" : "FULL TIME"]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value}</p></div>)}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {[[shiftGroups.length, "Turnos registrados", ""], [totalBoxes, "Cajas", ""], [totals.inspected, "Inspeccionadas", ""], [totals.accepted, "Aceptadas", "text-green-600"], [totals.rejected, "Rechazadas", "text-red-600"], [totals.reworked, "Retrabajadas", "text-amber-600"]].map(([value, label, color]) => <div key={String(label)} className="rounded-lg border bg-card p-3 text-center"><p className={`text-xl font-bold ${color}`}>{value}</p><p className="text-xs uppercase text-muted-foreground">{label}</p></div>)}
        </div>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold">Resultado general</h2>
            <p className="mt-1 text-sm text-muted-foreground">Distribución acumulada de todo el reporte</p>
          </div>
          <div className="grid items-center gap-8 p-5 md:grid-cols-[minmax(260px,360px)_1fr] md:p-8">
            <div className="mx-auto w-full max-w-[300px]">
              <div
                className="relative aspect-square rounded-full p-[22px] shadow-lg ring-1 ring-black/5"
                style={{ background: chartBackground }}
                role="img"
                aria-label={`Resultado total: ${totals.accepted} aceptadas, ${totals.rejected} rechazadas y ${totals.reworked} retrabajadas`}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
                  <span className="text-4xl font-bold tracking-tight">{totals.inspected}</span>
                  <span className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">Inspeccionadas</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium">Distribución total</p>
                <p className="text-sm text-muted-foreground">Resultados de todas las fechas, turnos y cajas</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {resultSegments.map((segment) => (
                  <div key={segment.label} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: segment.color }} />
                        <span className="text-sm font-medium">{segment.label}</span>
                      </div>
                      <span className={`text-lg font-bold ${segment.textClass}`}>{segment.value}</span>
                    </div>
                    <p className="mt-2 text-right text-xs text-muted-foreground">
                      {((segment.value / chartTotal) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2 border-t pt-4 text-sm">
                <span><span className="text-muted-foreground">Total revisado:</span> <b>{totals.inspected}</b></span>
                <span><span className="text-muted-foreground">Horas acumuladas del reporte:</span> <b>{totals.hours.toFixed(2)}</b></span>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-start gap-3 border-b px-5 py-4">
            <FileText className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Documentos y evidencias generales</h2>
              <p className="mt-1 text-sm text-muted-foreground">Archivos asociados al reporte y a su instrucción de trabajo.</p>
            </div>
          </div>
          <div className="p-5">
            {generalAttachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay documentos generales cargados.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {generalAttachments.map((attachment) => (
                  <AttachmentPreview key={attachment.id} mediaId={attachment.mediaId} label={attachment.label} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resumen por turno y día ({shiftGroups.length})</h2>
          <p className="text-sm text-muted-foreground">El desglose por caja, serie y lote está disponible en el Excel.</p>
          {shiftGroups.length === 0 ? <p className="text-sm text-muted-foreground">Este reporte todavía no tiene inspecciones.</p> : shiftGroups.map(([groupKey, details]) => {
            const shift = details[0]?.shift || "Sin turno";
            const summary = summarizeInspectionDetails(details, details.flatMap((detail) => incidentsByDetail.get(detail.id) || []), report);
            const comments = details
              .filter((detail) => Boolean(detail.comments?.trim()))
              .map((detail) => ({
                id: detail.id,
                text: detail.comments!.trim(),
                inspector: detail.inspector_name || "Inspector sin nombre",
              }));
            const evidence = details.flatMap((detail) =>
              (incidentsByDetail.get(detail.id) || [])
                .filter((incident) => Boolean(incident.evidence_url))
                .map((incident) => ({
                  id: incident.id,
                  mediaId: incident.evidence_url as string,
                  label: `${incident.defect_name || "Defecto"} · ${incident.quantity || 0} pieza(s)`,
                }))
            );
            return <div key={groupKey} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">{formatDateDisplay(details[0]?.inspection_date ?? null)} · Turno {shift}</h3><p className="text-xs text-muted-foreground">{details.map((item) => item.inspector_name).filter(Boolean).filter((name, index, all) => all.indexOf(name) === index).join(", ") || "Sin inspector"}</p></div><p className="text-sm font-medium">{summary.hours.toFixed(2)} horas totales del turno</p></div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Inspeccionadas", summary.inspected, ""], ["Aceptadas", summary.accepted, "text-green-600"], ["Rechazadas", summary.rejected, "text-red-600"], ["Retrabajadas", summary.reworked, "text-amber-600"]].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-md bg-muted/30 p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className={`text-lg font-semibold ${color}`}>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2 border-t pt-3">
                <h4 className="text-sm font-medium">Defectos encontrados</h4>
                {summary.defects.length === 0 ? <p className="text-sm text-muted-foreground">Sin defectos registrados.</p> : (
                  <ul className="space-y-2">
                    {summary.defects.map((defect) => <li key={defect.name} className="flex items-start justify-between gap-3 rounded-md bg-muted/40 p-3 text-sm"><span className="min-w-0 break-words">{defect.name}</span><span className="shrink-0 font-semibold">{defect.quantity}</span></li>)}
                  </ul>
                )}
              </div>
              <div className="grid gap-5 border-t pt-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Comentarios del reporte</h4>
                  </div>
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin comentarios registrados.</p>
                  ) : (
                    <ul className="space-y-2">
                      {comments.map((comment) => (
                        <li key={comment.id} className="rounded-md bg-muted/40 p-3 text-sm">
                          <p className="whitespace-pre-wrap break-words">{comment.text}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{comment.inspector}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium">Evidencias de defectos</h4>
                  </div>
                  {evidence.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin evidencias cargadas.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {evidence.map((item) => (
                        <AttachmentPreview key={item.id} mediaId={item.mediaId} label={item.label} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>;
          })}
        </section>
      </div>
    </PageContainer>
  );
}
