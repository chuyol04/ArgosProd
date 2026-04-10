import "server-only";
import { cookies } from "next/headers";
import { IUsersResponse } from "../types/users.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchUsers(
    search: string | null,
    limit: number,
    offset: number
): Promise<{ data?: IUsersResponse; error?: string }> {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const url = `${EXPRESS_BASE_URL}/users?${params.toString()}`;
        const res = await fetch(url, {
            method: "GET",
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });

        if (!res.ok) {
            let errorMessage = `${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                errorMessage = errorData.motive || errorMessage;
            } catch {}
            return { error: errorMessage };
        }

        const json = await res.json();
        return { data: { users: json.data || [], total: json.total || 0 } };
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Error al cargar usuarios" };
    }
}
