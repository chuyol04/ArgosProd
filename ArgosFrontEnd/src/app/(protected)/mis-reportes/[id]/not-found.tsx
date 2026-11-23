import PageContainer from "@/components/layout/PageContainer";
import { PortalState } from "../_components/PortalState";

export default function ReportNotFound() {
  return (
    <PageContainer>
      <PortalState
        kind="not-found"
        title="Reporte no encontrado"
        description="El reporte no existe o no está disponible dentro de los servicios asignados a tu cuenta."
        backHref="/mis-reportes"
      />
    </PageContainer>
  );
}
