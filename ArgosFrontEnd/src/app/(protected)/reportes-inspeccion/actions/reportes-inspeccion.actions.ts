"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  IInspectionReport,
  CreateInspectionReportData,
  UpdateInspectionReportData,
  IInspectionReportDetails,
  IWorkInstructionOption,
} from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchWorkInstructionsForSelect(): Promise<IWorkInstructionOption[]> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions?limit=1000`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.motive || "Failed to fetch work instructions");
    }

    return (json.data || []).map(
      (wi: {
        id: number;
        description: string | null;
        part_name: string;
        service_name: string;
        client_name: string;
      }) => ({
        id: wi.id,
        description: wi.description,
        part_name: wi.part_name,
        service_name: wi.service_name,
        client_name: wi.client_name,
      })
    );
  } catch (err) {
    console.error("Fetch work instructions for select error:", err);
    return [];
  }
}

export async function createInspectionReport(
  data: CreateInspectionReportData
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

    const res = await fetch(`${EXPRESS_BASE_URL}/reports/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.motive || "Failed to create inspection report");
    }

    revalidatePath("/reportes-inspeccion");
    return { success: true, id: json.id };
  } catch (err) {
    console.error("Create inspection report error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function updateInspectionReport(
  id: number,
  data: UpdateInspectionReportData
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

    const res = await fetch(`${EXPRESS_BASE_URL}/reports/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${session}`,
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.motive || "Failed to update inspection report");
    }

    revalidatePath("/reportes-inspeccion");
    return { success: true };
  } catch (err) {
    console.error("Update inspection report error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getInspectionReportById(
  id: number
): Promise<{ success: boolean; data?: IInspectionReport; error?: string }> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/reports/${id}`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.motive || "Failed to fetch inspection report");
    }

    const report = json.data?.report;
    if (!report) {
      throw new Error("Inspection report data not found");
    }

    return { success: true, data: report };
  } catch (err) {
    console.error("Get inspection report error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getInspectionReportDetails(
  id: number
): Promise<{ success: boolean; data?: IInspectionReportDetails; error?: string }> {
  try {
    if (!EXPRESS_BASE_URL) {
      throw new Error("EXPRESS_BASE_URL is not defined");
    }

    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      throw new Error("No session cookie");
    }

    const res = await fetch(`${EXPRESS_BASE_URL}/reports/${id}`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.motive || "Failed to fetch inspection report details");
    }

    if (!json.data) {
      throw new Error("Inspection report data not found");
    }

    return {
      success: true,
      data: json.data as IInspectionReportDetails,
    };
  } catch (err) {
    console.error("Get inspection report details error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function deleteInspectionReport(
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

    const res = await fetch(`${EXPRESS_BASE_URL}/reports/${id}`, {
      method: "DELETE",
      headers: {
        Cookie: `session=${session}`,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.motive || "Failed to delete inspection report");
    }

    revalidatePath("/reportes-inspeccion");
    return { success: true };
  } catch (err) {
    console.error("Delete inspection report error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
