"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
    IWorkInstruction,
    CreateWorkInstructionData,
    UpdateWorkInstructionData,
    IWorkInstructionDetails,
} from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export interface IServiceOption {
    id: number;
    name: string | null;
    client_name: string;
}

export interface IPartOption {
    id: number;
    name: string;
}

export interface IUserOption {
    id: number;
    name: string;
    email: string;
    role: string | null;
}

export async function fetchServicesForSelect(): Promise<IServiceOption[]> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/services?limit=1000`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch services");
        }

        return (json.data || []).map((s: { id: number; name: string | null; client_name: string }) => ({
            id: s.id,
            name: s.name,
            client_name: s.client_name,
        }));
    } catch (err) {
        console.error("Fetch services for select error:", err);
        return [];
    }
}

export async function fetchPartsForSelect(): Promise<IPartOption[]> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/parts`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch parts");
        }

        return (json.data || []).map((p: { id: number; name: string }) => ({
            id: p.id,
            name: p.name,
        }));
    } catch (err) {
        console.error("Fetch parts for select error:", err);
        return [];
    }
}

export async function createWorkInstruction(
    data: CreateWorkInstructionData
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

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to create work instruction");
        }

        revalidatePath('/instrucciones-trabajo');
        return { success: true, id: json.id };
    } catch (err) {
        console.error("Create work instruction error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function updateWorkInstruction(
    id: number,
    data: UpdateWorkInstructionData
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

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to update work instruction");
        }

        revalidatePath('/instrucciones-trabajo');
        return { success: true };
    } catch (err) {
        console.error("Update work instruction error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function getWorkInstructionById(
    id: number
): Promise<{ success: boolean; data?: IWorkInstruction; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/${id}`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch work instruction");
        }

        const instruction = json.data?.instruction;
        if (!instruction) {
            throw new Error("Work instruction data not found");
        }

        return {
            success: true,
            data: {
                id: instruction.id,
                inspection_rate_per_hour: instruction.inspection_rate_per_hour,
                description: instruction.description,
                part_id: instruction.part_id,
                part_name: instruction.part_name,
                service_id: instruction.service_id,
                service_name: instruction.service_name,
                client_id: instruction.client_id,
                client_name: instruction.client_name,
            }
        };
    } catch (err) {
        console.error("Get work instruction error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function deleteWorkInstruction(
    id: number
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

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/${id}`, {
            method: 'DELETE',
            headers: {
                'Cookie': `session=${session}`,
            },
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to delete work instruction");
        }

        revalidatePath('/instrucciones-trabajo');
        return { success: true };
    } catch (err) {
        console.error("Delete work instruction error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function getWorkInstructionDetails(
    id: number
): Promise<{ success: boolean; data?: IWorkInstructionDetails; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/${id}`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch work instruction details");
        }

        if (!json.data) {
            throw new Error("Work instruction data not found");
        }

        return {
            success: true,
            data: json.data as IWorkInstructionDetails,
        };
    } catch (err) {
        console.error("Get work instruction details error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function fetchUsersForSelect(): Promise<IUserOption[]> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/users/select`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to fetch users");
        }

        return (json.data || []).map((u: { id: number; name: string; email: string; role: string | null }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
        }));
    } catch (err) {
        console.error("Fetch users for select error:", err);
        return [];
    }
}

export async function updateWorkInstructionCollaborators(
    id: number,
    userIds: number[]
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

        const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/${id}/collaborators`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session=${session}`,
            },
            body: JSON.stringify({ user_ids: userIds }),
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.motive || "Failed to update collaborators");
        }

        revalidatePath('/instrucciones-trabajo');
        return { success: true };
    } catch (err) {
        console.error("Update collaborators error:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}
