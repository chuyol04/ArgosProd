import "server-only";
import { IClient, IClientsResponse } from "@/app/(protected)/clients/types/clients.types";
import { cookies } from 'next/headers';

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchClients(
    search: string | null,
    limit: number,
    offset: number
): Promise<{ data?: IClientsResponse; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie. User is not authenticated.");
        }

        // Build query params
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const url = `${EXPRESS_BASE_URL}/clients?${params.toString()}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            let errorMessage = `GET ${url} failed: ${res.status} ${res.statusText}`;
            try {
                const errorData = await res.json();
                errorMessage = errorData.motive || errorMessage;
            } catch {
                // Use default message
            }
            return { error: errorMessage };
        }

        const json = await res.json();

        // Backend returns { success: true, data: [...], total: number }
        const clients: IClient[] = json.data || [];
        const total: number = json.total ?? clients.length;

        return {
            data: {
                clients,
                total,
            }
        };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Fetch clients error:", err);
        return { error: errorMessage };
    }
}

// Keep old function for backward compatibility with other pages
export async function getClients(): Promise<IClient[]> {
    const result = await fetchClients(null, 1000, 0);
    if (result.error) {
        throw new Error(result.error);
    }
    return result.data?.clients || [];
}
