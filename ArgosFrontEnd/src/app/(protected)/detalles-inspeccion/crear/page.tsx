import PageContainer from "@/components/layout/PageContainer";
import InspectionDetailForm from "@/app/(protected)/detalles-inspeccion/_components/InspectionDetailForm";
import {
  fetchInspectors,
  fetchReportOptions,
} from "@/app/(protected)/detalles-inspeccion/data/detalles-inspeccion.data";

interface PageProps {
  searchParams: Promise<{ report_id?: string }>;
}

export default async function CreateInspectionDetailPage({ searchParams }: PageProps) {
  const { report_id } = await searchParams;
  const reportId = report_id ? parseInt(report_id, 10) : undefined;

  const [inspectors, reports] = await Promise.all([
    fetchInspectors(),
    fetchReportOptions(),
  ]);

  return (
    <PageContainer>
      <InspectionDetailForm
        inspectors={inspectors}
        reports={reports}
        initialMode="create"
        reportId={reportId}
      />
    </PageContainer>
  );
}
