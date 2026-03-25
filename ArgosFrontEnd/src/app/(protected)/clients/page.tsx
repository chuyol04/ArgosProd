import ClientsTable from "@/app/(protected)/clients/_components/ClientsTable";
import { fetchClients } from "@/app/(protected)/clients/data/clients.data";
import { loadSearchParams } from "@/app/(protected)/clients/utils/search-params";
import { SearchParams } from "nuqs/server";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<SearchParams> };

export default async function ClientsPage({ searchParams }: PageProps) {
  const {
    search: searchRaw,
    limit,
    page,
  } = await loadSearchParams(searchParams);

  const search = searchRaw || null;
  const offset = (page - 1) * limit;

  const result = await fetchClients(search, limit, offset);

  if (result.error) {
    return (
      <div className="mt-4 flex w-full flex-col gap-4 px-4 lg:gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-foreground mt-1 font-bold text-balance">
              Clientes
            </h1>
          </div>
        </div>

        {/* Error Display */}
        <div className="rounded-lg border border-red-500 bg-red-50 p-4 lg:p-6 dark:bg-red-950">
          <h2 className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
            Error al cargar datos
          </h2>
          <pre className="font-mono text-sm break-words whitespace-pre-wrap text-red-600 dark:text-red-300">
            {result.error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ClientsTable initialData={result.data!} />
    </div>
  );
}
