"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
    IClient,
    CreateClientData,
    UpdateClientData
} from "@/app/(protected)/clients/types/clients.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function createClient(
    data: CreateClientData
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

        const res = await fetch(`${EXPRESS_BASE_URL}/clients/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to create client");
        }

        revalidatePath('/clients');
        return { success: true, id: json.id };
    } catch (err) {
        console.error("Create client error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function updateClient(
    clientId: number,
    data: UpdateClientData
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

        const res = await fetch(`${EXPRESS_BASE_URL}/clients/${clientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to update client");
        }

        revalidatePath('/clients');
        return { success: true };
    } catch (err) {
        console.error("Update client error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function getClientById(
    clientId: number
): Promise<{ success: boolean; data?: IClient; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/clients/${clientId}`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch client");
        }

        return { success: true, data: json.data };
    } catch (err) {
        console.error("Get client error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function deleteClient(
    clientId: number
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

        const res = await fetch(`${EXPRESS_BASE_URL}/clients/${clientId}`, {
            method: 'DELETE',
            headers: {
                'Cookie': `session=${session}`,
            },
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to delete client");
        }

        revalidatePath('/clients');
        return { success: true };
    } catch (err) {
        console.error("Delete client error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}
