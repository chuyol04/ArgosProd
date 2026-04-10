import { fetchMediaList } from "./data/media.data";
import { MediaGallery } from "./_components/MediaGallery";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function MediaPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const limit = typeof params.limit === "string" ? parseInt(params.limit, 10) : 20;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;

  const result = await fetchMediaList(search || null, limit, page);

  return (
    <MediaGallery
      initialData={result.data ?? { files: [], total: 0 }}
      error={result.error}
    />
  );
}
