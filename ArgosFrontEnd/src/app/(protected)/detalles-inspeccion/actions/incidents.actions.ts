"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { deleteMediaIfExists } from "@/lib/storage/deleteMedia";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export interface IDefect {
  id: number;
  name: string;
  description: string | null;
}

export interface IIncident {
  id: number;
  defect_id: number;
  inspection_detail_id: number;
  quantity: number | null;
  evidence_url: string | null;
  defect_name: string;
  defect_description: string | null;
}

export interface CreateIncidentData {
  defect_id: number;
  inspection_detail_id: number;
  quantity?: number;
  evidence_url?: string;
}

export async function fetchDefects(): Promise<IDefect[]> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/defects`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to fetch defects");
    }

    return json.data || [];
  } catch (err) {
    console.error("Fetch defects error:", err);
    return [];
  }
}

export async function fetchIncidentsByDetail(
  inspectionDetailId: number
): Promise<IIncident[]> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(
      `${EXPRESS_BASE_URL}/incidents?inspection_detail_id=${inspectionDetailId}`,
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
      throw new Error(json.motive || "Failed to fetch incidents");
    }

    return json.data || [];
  } catch (err) {
    console.error("Fetch incidents error:", err);
    return [];
  }
}

export async function createIncident(
  data: CreateIncidentData
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/incidents/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to create incident");
    }

    revalidatePath("/detalles-inspeccion");
    return { success: true, id: json.id };
  } catch (err) {
    console.error("Create incident error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updateIncident(
  id: number,
  data: Partial<CreateIncidentData>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/incidents/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to update incident");
    }

    revalidatePath("/detalles-inspeccion");
    return { success: true };
  } catch (err) {
    console.error("Update incident error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteIncident(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/incidents/${id}`, {
      method: "DELETE",
      headers: {
        Cookie: `session=${session}`,
      },
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to delete incident");
    }

    // Clean up GridFS file
    await deleteMediaIfExists(json.deleted_evidence_url);

    revalidatePath("/detalles-inspeccion");
    return { success: true };
  } catch (err) {
    console.error("Delete incident error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
