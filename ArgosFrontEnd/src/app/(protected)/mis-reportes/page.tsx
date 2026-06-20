import Link from "next/link";
import { ArrowRight, Calendar, ClipboardList, User } from "lucide-react";
import { fetchInspectionReports } from "@/app/(protected)/reportes-inspeccion/data/reportes-inspeccion.data";
import PageContainer from "@/components/layout/PageContainer";
import { formatDateDisplay } from "@/lib/dateTimeUtils";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Read-only "Mis Reportes" view for the client portal. The backend already
// scopes GET /reports to the requester's own client_id when their role is
// 'Cliente' - this page reuses the exact same data fetcher as the admin
// reports table, no separate client-aware query needed on the frontend.
export default async function MisReportesPage({ searchParams }: Props) {
  const params = await searchParams;
  const limit = 9;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  const { reports, total } = await fetchInspectionReports({ limit, page });
  const hasMore = page * limit < total;

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <div>
          <h1 className="text-foreground text-xl font-bold text-balance lg:text-3xl">
            Mis Reportes
          </h1>
          <p className="text-muted-foreground text-sm">
            Reportes de inspección de tus piezas. Esta vista es de solo lectura.
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="border-border bg-card rounded-lg border p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No tienes reportes de inspección todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/mis-reportes/${report.id}`}
                className="border-border bg-card hover:border-primary/50 hover:shadow-md group flex flex-col gap-3 rounded-xl border p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-semibold">{report.part_name}</p>
                    <p className="text-muted-foreground truncate text-xs">{report.service_name}</p>
                  </div>
                  <span className="text-muted-foreground bg-muted shrink-0 rounded-full px-2 py-1 text-xs font-medium">
                    #{report.id}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateDisplay(report.start_date)}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  {report.inspector_names || "Sin inspector asignado"}
                </div>

                <div className="mt-1 grid grid-cols-4 gap-2 rounded-lg bg-muted/40 p-2 text-center">
                  <div>
                    <p className="text-sm font-semibold">{report.total_inspected_pieces ?? 0}</p>
                    <p className="text-muted-foreground text-[10px] uppercase">Inspec.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-600">
                      {report.total_accepted_pieces ?? 0}
                    </p>
                    <p className="text-muted-foreground text-[10px] uppercase">Acept.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-600">
                      {report.total_rejected_pieces ?? 0}
                    </p>
                    <p className="text-muted-foreground text-[10px] uppercase">Rech.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-600">
                      {report.total_reworked_pieces ?? 0}
                    </p>
                    <p className="text-muted-foreground text-[10px] uppercase">Retrab.</p>
                  </div>
                </div>

                <div className="text-primary mt-1 flex items-center justify-end gap-1 text-sm font-medium">
                  <ClipboardList className="h-4 w-4" />
                  Ver reporte
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Página {page}</span>
            <div className="flex gap-4">
              {page > 1 && (
                <Link href={`/mis-reportes?page=${page - 1}`} className="text-primary hover:underline">
                  Anterior
                </Link>
              )}
              {hasMore && (
                <Link href={`/mis-reportes?page=${page + 1}`} className="text-primary hover:underline">
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
