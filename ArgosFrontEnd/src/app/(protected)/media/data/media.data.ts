import "server-only";
import { IMediaListResponse } from "../types/media.types";

export async function fetchMediaList(
  search: string | null,
  limit: number,
  page: number
): Promise<{ data?: IMediaListResponse; error?: string }> {
  try {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", String(limit));
    params.set("page", String(page));

    // Internal API call — no session needed since it's server-to-server within Next.js
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${origin}/api/media/list?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err.error || `${res.status} ${res.statusText}` };
    }

    const json = await res.json();
    return { data: { files: json.files || [], total: json.total || 0 } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error al cargar media" };
  }
}
