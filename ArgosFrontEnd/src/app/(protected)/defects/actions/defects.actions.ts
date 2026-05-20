"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { IDefect, CreateDefectData, UpdateDefectData } from "@/app/(protected)/defects/types/defects.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function getDefectById(
    defectId: number
): Promise<{ success: boolean; data?: IDefect; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/defects/${defectId}`, {
            method: "GET",
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to fetch defect");

        return { success: true, data: json.data };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export async function createDefect(
    data: CreateDefectData
): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/defects/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `session=${session}` },
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to create defect");

        revalidatePath("/defects");
        return { success: true, id: json.id };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export async function updateDefect(
    defectId: number,
    data: UpdateDefectData
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/defects/${defectId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Cookie: `session=${session}` },
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to update defect");

        revalidatePath("/defects");
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export async function deleteDefect(
    defectId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/defects/${defectId}`, {
            method: "DELETE",
            headers: { Cookie: `session=${session}` },
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to delete defect");

        revalidatePath("/defects");
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}
