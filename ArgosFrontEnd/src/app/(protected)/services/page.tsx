import { fetchServices } from "@/app/(protected)/services/data/services.data";
import { getClients } from "@/app/(protected)/clients/data/clients.data";
import ServicesTable from "@/app/(protected)/services/_components/ServicesTable";
import { cookies } from "next/headers";
import { ACTIVE_CLIENT_COOKIE, parseActiveClientId } from "@/lib/clientScope";

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
  const cookieStore = await cookies();
  const activeClientId = parseActiveClientId(
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value
  );

  const [servicesResult, clients] = await Promise.all([
    fetchServices(search, limit, offset),
    getClients(),
  ]);

  const initialData = servicesResult.data ?? { services: [], total: 0 };
  const availableClients = activeClientId
    ? clients.filter((client) => client.id === activeClientId)
    : clients;

  return <ServicesTable initialData={initialData} clients={availableClients} />;
}
