"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  IInspectionDetailExtended,
  IInspectionDetailFormData,
  IInspector,
  IReportOption,
} from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function getInspectionDetailById(
  id: number
): Promise<{ success: boolean; data?: IInspectionDetailExtended; error?: string }> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/inspection-details/${id}`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to fetch inspection detail");
    }

    return { success: true, data: json.data };
  } catch (err) {
    console.error("Get inspection detail error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function createInspectionDetail(
  data: IInspectionDetailFormData
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

    const res = await fetch(`${EXPRESS_BASE_URL}/inspection-details/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to create inspection detail");
    }

    revalidatePath("/detalles-inspeccion");
    revalidatePath("/reportes-inspeccion");
    return { success: true, id: json.id };
  } catch (err) {
    console.error("Create inspection detail error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updateInspectionDetail(
  id: number,
  data: Partial<IInspectionDetailFormData>
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

    const res = await fetch(`${EXPRESS_BASE_URL}/inspection-details/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to update inspection detail");
    }

    revalidatePath("/detalles-inspeccion");
    revalidatePath("/reportes-inspeccion");
    return { success: true };
  } catch (err) {
    console.error("Update inspection detail error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteInspectionDetail(
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

    const res = await fetch(`${EXPRESS_BASE_URL}/inspection-details/${id}`, {
      method: "DELETE",
      headers: {
        Cookie: `session=${session}`,
      },
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to delete inspection detail");
    }

    revalidatePath("/detalles-inspeccion");
    revalidatePath("/reportes-inspeccion");
    return { success: true };
  } catch (err) {
    console.error("Delete inspection detail error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function fetchInspectorsForSelect(workInstructionId?: number): Promise<IInspector[]> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    // If work_instruction_id is provided, filter inspectors by collaborators
    const url = workInstructionId
      ? `${EXPRESS_BASE_URL}/work-instructions/users/select?work_instruction_id=${workInstructionId}`
      : `${EXPRESS_BASE_URL}/work-instructions/users/select`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to fetch inspectors");
    }

    return (json.data || []).map((u: { id: number; name: string }) => ({
      id: u.id,
      name: u.name,
    }));
  } catch (err) {
    console.error("Fetch inspectors error:", err);
    return [];
  }
}

export async function fetchReportsForSelect(): Promise<IReportOption[]> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/reports?limit=100`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.motive || "Failed to fetch reports");
    }

    return (json.data || []).map(
      (r: {
        id: number;
        work_instruction_id: number;
        part_name: string;
        service_name: string;
        po_number: string | null;
      }) => ({
        id: r.id,
        work_instruction_id: r.work_instruction_id,
        part_name: r.part_name,
        service_name: r.service_name,
        po_number: r.po_number,
      })
    );
  } catch (err) {
    console.error("Fetch reports error:", err);
    return [];
  }
}
