import { notFound } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import InspectionDetailForm from "@/app/(protected)/detalles-inspeccion/_components/InspectionDetailForm";
import { fetchInspectionDetailById, fetchInspectors } from "@/app/(protected)/detalles-inspeccion/data/detalles-inspeccion.data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InspectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    notFound();
  }

  const [detailResult, inspectors] = await Promise.all([
    fetchInspectionDetailById(numericId),
    fetchInspectors(),
  ]);

  if (!detailResult.success || !detailResult.data) {
    notFound();
  }

  return (
    <PageContainer>
      <InspectionDetailForm
        detail={detailResult.data}
        inspectors={inspectors}
        reports={[]}
        initialMode="view"
      />
    </PageContainer>
  );
}
