import PartsTable from "@/app/(protected)/parts/_components/PartsTable";
import { fetchParts } from "@/app/(protected)/parts/data/parts.data";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

export default async function PartsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search || null : null;
  const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) || 10 : 10;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) || 1 : 1;
  const offset = (page - 1) * limit;

  const result = await fetchParts(search, limit, offset);

  if (result.error) {
    return (
      <div className="mt-4 flex w-full flex-col gap-4 px-4 lg:gap-6">
        <h1 className="text-foreground mt-1 font-bold text-balance">Piezas</h1>
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
      <PartsTable initialData={result.data!} />
    </div>
  );
}
