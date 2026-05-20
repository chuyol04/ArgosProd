import "server-only";
import { IDefect, IDefectsResponse } from "@/app/(protected)/defects/types/defects.types";
import { cookies } from "next/headers";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchDefects(): Promise<{ data?: IDefectsResponse; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie. User is not authenticated.");

        const res = await fetch(`${EXPRESS_BASE_URL}/defects`, {
            method: "GET",
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });

        if (!res.ok) {
            let errorMessage = `GET /defects failed: ${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                errorMessage = errorData.motive || errorMessage;
            } catch { /* use default */ }
            return { error: errorMessage };
        }

        const json = await res.json();
        const defects: IDefect[] = json.data || [];
        return { data: { defects } };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Fetch defects error:", err);
        return { error: errorMessage };
    }
}
