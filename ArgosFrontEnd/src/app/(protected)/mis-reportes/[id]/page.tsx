import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInspectionReportDetails } from "@/app/(protected)/reportes-inspeccion/actions/reportes-inspeccion.actions";
import { fetchIncidentsByDetail } from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";
import PageContainer from "@/components/layout/PageContainer";
import { MediaItem } from "@/components/ui/media-item";
import { formatDateDisplay } from "@/lib/dateTimeUtils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

// Read-only report detail for the client portal. getInspectionReportDetails
// already 404s (via the backend) if this report doesn't belong to the
// requester's own client, even if they type the ID directly in the URL.
export default async function MisReporteDetallePage({ params }: Props) {
  const { id } = await params;
  const reportId = Number(id);
  if (!Number.isInteger(reportId)) notFound();

  const result = await getInspectionReportDetails(reportId);
  if (!result.success || !result.data) notFound();

  const { report, inspections } = result.data;
  const defectsByDetail = await Promise.all(
    inspections.map((detail) => fetchIncidentsByDetail(detail.id))
  );

  const totals = inspections.reduce(
    (acc, d) => ({
      inspected: acc.inspected + (d.inspected_pieces || 0),
      accepted: acc.accepted + (d.accepted_pieces || 0),
      rejected: acc.rejected + (d.rejected_pieces || 0),
      reworked: acc.reworked + (d.reworked_pieces || 0),
    }),
    { inspected: 0, accepted: 0, rejected: 0, reworked: 0 }
  );
  const totalDefects = defectsByDetail.flat().reduce((sum, d) => sum + (d.quantity || 0), 0);

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex items-center gap-3">
          <Link href="/mis-reportes" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-foreground text-xl font-bold lg:text-2xl">Reporte #{report.id}</h1>
        </div>

        {/* Report summary */}
        <div className="border-border bg-card grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Cliente</p>
            <p className="text-sm font-medium">{report.client_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Servicio</p>
            <p className="text-sm font-medium">{report.service_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Pieza</p>
            <p className="text-sm font-medium">{report.part_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Fecha de Inicio</p>
            <p className="text-sm font-medium">{formatDateDisplay(report.start_date)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Número de PO</p>
            <p className="text-sm font-medium">{report.po_number || "-"}</p>
          </div>
          {report.description && (
            <div className="col-span-full">
              <p className="text-muted-foreground text-xs">Descripción</p>
              <p className="text-sm whitespace-pre-wrap">{report.description}</p>
            </div>
          )}
        </div>

        {/* Totals summary - the "at a glance" version of the Excel export */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="border-border bg-card rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{inspections.length}</p>
            <p className="text-muted-foreground text-xs uppercase">Cajas</p>
          </div>
          <div className="border-border bg-card rounded-lg border p-3 text-center">
            <p className="text-xl font-bold">{totals.inspected}</p>
            <p className="text-muted-foreground text-xs uppercase">Inspeccionadas</p>
          </div>
          <div className="border-border bg-card rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-green-600">{totals.accepted}</p>
            <p className="text-muted-foreground text-xs uppercase">Aceptadas</p>
          </div>
          <div className="border-border bg-card rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-red-600">{totals.rejected}</p>
            <p className="text-muted-foreground text-xs uppercase">Rechazadas</p>
          </div>
          <div className="border-border bg-card rounded-lg border p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{totals.reworked}</p>
            <p className="text-muted-foreground text-xs uppercase">Retrabajadas</p>
          </div>
        </div>
        {totalDefects > 0 && (
          <p className="text-muted-foreground text-sm">
            Defectos totales encontrados: <span className="font-semibold">{totalDefects}</span>
          </p>
        )}

        {/* Boxes */}
        <div className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-wide">
            Detalles por Caja ({inspections.length})
          </h2>

          {inspections.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Este reporte no tiene cajas registradas todavía.
            </p>
          ) : (
            inspections.map((detail, index) => {
              const defects = defectsByDetail[index] || [];
              return (
                <div key={detail.id} className="border-border bg-card space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Caja {index + 1}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateDisplay(detail.inspection_date)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground text-xs"># Serie</p>
                      <p>{detail.serial_number || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs"># Lote</p>
                      <p>{detail.lot_number || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Fecha Manufactura</p>
                      <p>{formatDateDisplay(detail.manufacture_date ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Inspector</p>
                      <p>{detail.inspector_name || "-"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Inspeccionadas</p>
                      <p className="font-medium">{detail.inspected_pieces ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Aceptadas</p>
                      <p className="font-medium text-green-600">{detail.accepted_pieces ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Rechazadas</p>
                      <p className="font-medium text-red-600">{detail.rejected_pieces ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Retrabajadas</p>
                      <p className="font-medium text-yellow-600">{detail.reworked_pieces ?? 0}</p>
                    </div>
                  </div>

                  {defects.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Defectos
                      </p>
                      <div className="space-y-2">
                        {defects.map((incident) => (
                          <div
                            key={incident.id}
                            className="flex items-center gap-3 rounded-lg border p-2"
                          >
                            {incident.evidence_url && /^[a-f0-9]{24}$/.test(incident.evidence_url) && (
                              <MediaItem mediaId={incident.evidence_url} size="sm" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{incident.defect_name}</p>
                              {incident.quantity != null && (
                                <p className="text-muted-foreground text-xs">
                                  Cantidad: {incident.quantity}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </PageContainer>
  );
}
