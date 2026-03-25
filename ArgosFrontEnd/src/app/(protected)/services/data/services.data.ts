import "server-only";
import { cookies } from "next/headers";
import { IService, IServicesResponse } from "@/app/(protected)/services/types/services.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchServices(
    search: string | null,
    limit: number,
    offset: number
): Promise<{ data?: IServicesResponse; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie. User is not authenticated.");
        }

        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", String(limit));
        params.set("offset", String(offset));

        const url = `${EXPRESS_BASE_URL}/services?${params.toString()}`;

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

        const services: IService[] = json.data || [];
        const total: number = json.total ?? services.length;

        return {
            data: {
                services,
                total,
            }
        };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Fetch services error:", err);
        return { error: errorMessage };
    }
}

// Keep for backward compatibility
export async function getServices(): Promise<IService[]> {
    const result = await fetchServices(null, 1000, 0);
    if (result.error) {
        console.error(result.error);
        return [];
    }
    return result.data?.services || [];
}
