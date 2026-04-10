"use server";

import { cookies } from "next/headers";

/**
 * Fully deletes media files: clears MySQL references, then removes from GridFS.
 */
export async function deleteMediaFiles(
  mediaIds: string[]
): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${origin}/api/media/purge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify({ media_ids: mediaIds }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, deleted: 0, errors: [err.error || res.statusText] };
    }

    const data = await res.json();
    return {
      success: (data.errors?.length ?? 0) === 0,
      deleted: data.deleted ?? 0,
      errors: data.errors ?? [],
    };
  } catch (err) {
    return {
      success: false,
      deleted: 0,
      errors: [err instanceof Error ? err.message : "Error"],
    };
  }
}
