"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { IUserDetails, IRole } from "../types/users.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

async function getSession() {
    const cookieStore = await cookies();
    return cookieStore.get("session")?.value;
}

export async function getUserById(
    id: number
): Promise<{ success: boolean; data?: IUserDetails; error?: string }> {
    try {
        const session = await getSession();
        const res = await fetch(`${EXPRESS_BASE_URL}/users/${id}`, {
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.motive || res.statusText };
        }
        const json = await res.json();
        return { success: true, data: json.data };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Error" };
    }
}

export async function updateUser(
    id: number,
    data: {
        name: string;
        email: string;
        phone_number: string;
        is_active: boolean;
        role_id: number | null;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getSession();
        const res = await fetch(`${EXPRESS_BASE_URL}/users/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Cookie: `session=${session}`,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.motive || res.statusText };
        }
        revalidatePath("/users");
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Error" };
    }
}

export async function fetchRoles(): Promise<IRole[]> {
    try {
        const session = await getSession();
        const res = await fetch(`${EXPRESS_BASE_URL}/roles`, {
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.data || [];
    } catch {
        return [];
    }
}
