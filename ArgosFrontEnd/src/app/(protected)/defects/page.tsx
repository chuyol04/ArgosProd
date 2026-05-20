import DefectsTable from "@/app/(protected)/defects/_components/DefectsTable";
import { fetchDefects } from "@/app/(protected)/defects/data/defects.data";

export const dynamic = "force-dynamic";

export default async function DefectsPage() {
  const result = await fetchDefects();

  if (result.error) {
    return (
      <div className="mt-4 flex w-full flex-col gap-4 px-4 lg:gap-6">
        <h1 className="text-foreground mt-1 font-bold text-balance">Catálogo de Defectos</h1>
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
      <DefectsTable initialData={result.data!} />
    </div>
  );
}
