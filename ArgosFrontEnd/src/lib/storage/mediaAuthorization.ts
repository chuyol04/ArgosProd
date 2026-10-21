import "server-only";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function getAuthorizedMediaIds(
  session: string,
  mediaIds: string[]
): Promise<Set<string>> {
  if (!EXPRESS_BASE_URL) {
    throw new Error("EXPRESS_BASE_URL is not defined");
  }

  const uniqueIds = [...new Set(mediaIds.map((id) => id.toLowerCase()))];
  const params = new URLSearchParams({ media_ids: uniqueIds.join(",") });
  const response = await fetch(`${EXPRESS_BASE_URL}/reports/media/access?${params}`, {
    method: "GET",
    headers: { Cookie: `session=${session}` },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return new Set();
  }
  if (!response.ok) {
    throw new Error(`Media authorization failed with status ${response.status}`);
  }

  const body = await response.json();
  return new Set(
    Array.isArray(body.data)
      ? body.data.map((id: unknown) => String(id).toLowerCase())
      : []
  );
}
