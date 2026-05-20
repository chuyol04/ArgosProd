"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { IPart, CreatePartData, UpdatePartData } from "@/app/(protected)/parts/types/parts.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function createPart(
    data: CreatePartData
): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/parts/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `session=${session}` },
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to create part");

        revalidatePath("/parts");
        return { success: true, id: json.id };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export async function updatePart(
    partId: number,
    data: UpdatePartData
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/parts/${partId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Cookie: `session=${session}` },
            body: JSON.stringify(data),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to update part");

        revalidatePath("/parts");
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export async function getPartById(
    partId: number
): Promise<{ success: boolean; data?: IPart; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/parts/${partId}`, {
            method: "GET",
            headers: { Cookie: `session=${session}` },
            cache: "no-store",
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to fetch part");

        return { success: true, data: json.data };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}

export async function deletePart(
    partId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) throw new Error("EXPRESS_BASE_URL is not defined");

        const cookieStore = await cookies();
        const session = cookieStore.get("session")?.value;
        if (!session) throw new Error("No session cookie");

        const res = await fetch(`${EXPRESS_BASE_URL}/parts/${partId}`, {
            method: "DELETE",
            headers: { Cookie: `session=${session}` },
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.motive || "Failed to delete part");

        revalidatePath("/parts");
        return { success: true };
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
}
