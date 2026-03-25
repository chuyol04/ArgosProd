"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
    IService,
    CreateServiceData,
    UpdateServiceData,
    IServiceDetails
} from "@/app/(protected)/services/types/services.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function createService(
    data: CreateServiceData
): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/services/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to create service");
        }

        revalidatePath('/services');
        return { success: true, id: json.id };
    } catch (err) {
        console.error("Create service error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function updateService(
    serviceId: number,
    data: UpdateServiceData
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/services/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to update service");
        }

        revalidatePath('/services');
        return { success: true };
    } catch (err) {
        console.error("Update service error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function getServiceById(
    serviceId: number
): Promise<{ success: boolean; data?: IService; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/services/${serviceId}`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch service");
        }

        // The API returns { service, client, work_instructions, collaborators }
        // We need to map it to our IService interface
        const service = json.data?.service;
        if (!service) {
            throw new Error("Service data not found");
        }

        return {
            success: true,
            data: {
                id: service.id,
                name: service.name,
                start_date: service.start_date,
                end_date: service.end_date,
                client_id: service.client_id,
                client_name: service.client_name,
                client_email: service.client_email,
            }
        };
    } catch (err) {
        console.error("Get service error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function getServiceDetails(
    serviceId: number
): Promise<{ success: boolean; data?: IServiceDetails; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/services/${serviceId}`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch service details");
        }

        return {
            success: true,
            data: json.data
        };
    } catch (err) {
        console.error("Get service details error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function deleteService(
    serviceId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/services/${serviceId}`, {
            method: 'DELETE',
            headers: {
                'Cookie': `session=${session}`,
            },
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to delete service");
        }

        revalidatePath('/services');
        return { success: true };
    } catch (err) {
        console.error("Delete service error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}
