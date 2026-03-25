import { fetchInspectionReports } from "@/app/(protected)/reportes-inspeccion/data/reportes-inspeccion.data";
import ReportsTable from "@/app/(protected)/reportes-inspeccion/_components/ReportsTable";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ReportesInspeccionPage({ searchParams }: Props) {
  const params = await searchParams;

  const search = typeof params.search === "string" ? params.search : undefined;
  const work_instruction_id =
    typeof params.work_instruction_id === "string"
      ? parseInt(params.work_instruction_id, 10)
      : undefined;
  const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) : 10;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  const initialData = await fetchInspectionReports({
    search,
    work_instruction_id,
    limit,
    page,
  });

  return <ReportsTable initialData={initialData} />;
}
