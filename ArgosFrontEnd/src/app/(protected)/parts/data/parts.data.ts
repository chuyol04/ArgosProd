import "server-only";
import { IPart, IPartsResponse } from "@/app/(protected)/parts/types/parts.types";
import { cookies } from "next/headers";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchParts(
    search: string | null,
    limit: number,
    offset: number
): Promise<{ data?: IPartsResponse; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie. User is not authenticated.");

        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const url = `${EXPRESS_BASE_URL}/parts?${params.toString()}`;

        const res = await fetch(url, {
            method: "GET",
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });

        if (!res.ok) {
            let errorMessage = `GET ${url} failed: ${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                errorMessage = errorData.motive || errorMessage;
            } catch { /* use default */ }
            return { error: errorMessage };
        }

        const json = await res.json();
        const parts: IPart[] = json.data || [];
        const total: number = json.total ?? parts.length;

        return { data: { parts, total } };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Fetch parts error:", err);
        return { error: errorMessage };
    }
}
