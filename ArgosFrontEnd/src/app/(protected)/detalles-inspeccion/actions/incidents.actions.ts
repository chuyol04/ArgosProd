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
  defect_id: number | null;
  defect_label: string | null;
  inspection_detail_id: number;
  quantity: number | null;
  evidence_url: string | null;
  /** Catalog name when defect_id is set, otherwise the free-text defect_label. */
  defect_name: string;
  defect_description: string | null;
}

export interface CreateIncidentData {
  /** Optional catalog reference - a defect can be free text instead. */
  defect_id?: number;
  /** Free-text defect description. Required when defect_id is not provided. */
  defect_label?: string;
  inspection_detail_id: number;
  quantity?: number;
  evidence_url?: string;
}

export interface UpdateIncidentData {
  defect_id?: number | null;
  defect_label?: string | null;
  inspection_detail_id?: number;
  quantity?: number | null;
  evidence_url?: string | null;
}

export async function fetchDefects(workInstructionId?: number): Promise<IDefect[]> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const query = workInstructionId ? `?work_instruction_id=${workInstructionId}` : "";
    const res = await fetch(`${EXPRESS_BASE_URL}/defects${query}`, {
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
  data: UpdateIncidentData
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

/**
 * Removes only the evidence file from an existing defect/incident (keeps the
 * defect itself), so a wrongly-uploaded image can be cleared without
 * deleting the whole defect entry.
 */
export async function removeIncidentEvidence(
  id: number,
  previousEvidenceUrl: string | null
): Promise<{ success: boolean; error?: string }> {
  const result = await updateIncident(id, { evidence_url: null });
  if (result.success) {
    await deleteMediaIfExists(previousEvidenceUrl);
  }
  return result;
}
