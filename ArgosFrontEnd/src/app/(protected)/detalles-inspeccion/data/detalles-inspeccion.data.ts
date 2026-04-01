import { cookies } from "next/headers";
import {
  IInspectionDetailsListResponse,
  IInspectionDetailResponse,
  IInspector,
  IReportOption,
} from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function fetchInspectionDetailById(
  id: number
): Promise<IInspectionDetailResponse> {
  if (!EXPRESS_BASE_URL) {
    console.error("EXPRESS_BASE_URL is not defined");
    return { success: false, error: "Server configuration error" };
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("No session cookie");
    return { success: false, error: "No autenticado" };
  }

  try {
    const res = await fetch(`${EXPRESS_BASE_URL}/inspection-details/${id}`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      console.error("Failed to fetch inspection detail:", json.motive);
      return { success: false, error: json.motive || "Error al obtener detalle" };
    }

    return { success: true, data: json.data };
  } catch (error) {
    console.error("Error fetching inspection detail:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function fetchInspectionDetailsByReportId(
  reportId: number
): Promise<IInspectionDetailsListResponse> {
  if (!EXPRESS_BASE_URL) {
    console.error("EXPRESS_BASE_URL is not defined");
    return { success: false, error: "Server configuration error" };
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("No session cookie");
    return { success: false, error: "No autenticado" };
  }

  try {
    const res = await fetch(
      `${EXPRESS_BASE_URL}/inspection-details?report_id=${reportId}`,
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
      console.error("Failed to fetch inspection details:", json.motive);
      return { success: false, error: json.motive || "Error al obtener detalles" };
    }

    return { success: true, data: json.data ?? [] };
  } catch (error) {
    console.error("Error fetching inspection details:", error);
    return { success: false, error: "Error de conexión" };
  }
}

export async function fetchInspectors(): Promise<IInspector[]> {
  if (!EXPRESS_BASE_URL) {
    console.error("EXPRESS_BASE_URL is not defined");
    return [];
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("No session cookie");
    return [];
  }

  try {
    const res = await fetch(`${EXPRESS_BASE_URL}/work-instructions/users/select`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      console.error("Failed to fetch inspectors:", json.motive);
      return [];
    }

    return (json.data ?? []).map((u: { id: number; name: string }) => ({
      id: u.id,
      name: u.name,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

export async function fetchReportOptions(): Promise<IReportOption[]> {
  if (!EXPRESS_BASE_URL) {
    console.error("EXPRESS_BASE_URL is not defined");
    return [];
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("No session cookie");
    return [];
  }

  try {
    const res = await fetch(`${EXPRESS_BASE_URL}/reports?limit=100`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
      cache: "no-store",
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      console.error("Failed to fetch reports:", json.motive);
      return [];
    }

    return (json.data ?? []).map(
      (r: {
        id: number;
        part_name: string;
        service_name: string;
        po_number: string | null;
      }) => ({
        id: r.id,
        part_name: r.part_name,
        service_name: r.service_name,
        po_number: r.po_number,
      })
    );
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
}
