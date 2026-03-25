import { fetchWorkInstructions } from "@/app/(protected)/instrucciones-trabajo/data/instrucciones-trabajo.data";
import WorkInstructionsTable from "@/app/(protected)/instrucciones-trabajo/_components/WorkInstructionsTable";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function InstruccionesTrabajoPage({ searchParams }: Props) {
  const params = await searchParams;

  const search = typeof params.search === "string" ? params.search : undefined;
  const service_id = typeof params.service_id === "string" ? parseInt(params.service_id, 10) : undefined;
  const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) : 10;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  const initialData = await fetchWorkInstructions({
    search,
    service_id,
    limit,
    page,
  });

  return <WorkInstructionsTable initialData={initialData} defaultServiceId={service_id} />;
}
