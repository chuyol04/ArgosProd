import { cookies } from "next/headers";
import { IWorkInstructionsResponse } from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

interface FetchWorkInstructionsParams {
    search?: string;
    service_id?: number;
    limit?: number;
    page?: number;
}

export async function fetchWorkInstructions(
    params: FetchWorkInstructionsParams = {}
): Promise<IWorkInstructionsResponse> {
    const { search, service_id, limit = 10, page = 1 } = params;

    if (!EXPRESS_BASE_URL) {
        console.error("EXPRESS_BASE_URL is not defined");
        return { workInstructions: [], total: 0 };
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
        console.error("No session cookie");
        return { workInstructions: [], total: 0 };
    }

    const offset = (page - 1) * limit;
    const queryParams = new URLSearchParams();
    queryParams.set("limit", String(limit));
    queryParams.set("offset", String(offset));
    if (search) queryParams.set("search", search);
    if (service_id) queryParams.set("service_id", String(service_id));

    try {
        const res = await fetch(
            `${EXPRESS_BASE_URL}/work-instructions?${queryParams.toString()}`,
            {
                method: "GET",
                headers: {
                    Cookie: `session=${session}`,
                },
                cache: "no-store",
            }
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
            console.error("Failed to fetch work instructions:", json.motive);
            return { workInstructions: [], total: 0 };
        }

        return {
            workInstructions: json.data ?? [],
            total: json.total ?? 0,
        };
    } catch (error) {
        console.error("Error fetching work instructions:", error);
        return { workInstructions: [], total: 0 };
    }
}
