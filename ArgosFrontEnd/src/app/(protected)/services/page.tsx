import { fetchServices } from "@/app/(protected)/services/data/services.data";
import { getClients } from "@/app/(protected)/clients/data/clients.data";
import ServicesTable from "@/app/(protected)/services/_components/ServicesTable";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ServicesPage({ searchParams }: Props) {
  const params = await searchParams;

  const search = typeof params.search === "string" ? params.search : null;
  const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) : 10;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const offset = (page - 1) * limit;

  const [servicesResult, clients] = await Promise.all([
    fetchServices(search, limit, offset),
    getClients(),
  ]);

  const initialData = servicesResult.data ?? { services: [], total: 0 };

  return <ServicesTable initialData={initialData} clients={clients} />;
}
