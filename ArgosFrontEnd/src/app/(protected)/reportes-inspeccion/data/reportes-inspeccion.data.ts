import { cookies } from "next/headers";
import {
  IInspectionReportsResponse,
  IReportDashboard,
} from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";
import { ACTIVE_CLIENT_COOKIE, parseActiveClientId } from "@/lib/clientScope";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

interface FetchInspectionReportsParams {
  search?: string;
  work_instruction_id?: number;
  limit?: number;
  page?: number;
}

export async function fetchInspectionReports(
  params: FetchInspectionReportsParams = {}
): Promise<IInspectionReportsResponse> {
  const { search, work_instruction_id, limit = 10, page = 1 } = params;

  if (!EXPRESS_BASE_URL) {
    console.error("EXPRESS_BASE_URL is not defined");
    return {
      reports: [],
      total: 0,
      loadError: { status: 500, message: "No fue posible conectar con el servicio." },
    };
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("No session cookie");
    return {
      reports: [],
      total: 0,
      loadError: { status: 401, message: "Tu sesión no está disponible." },
    };
  }

  const offset = (page - 1) * limit;
  const queryParams = new URLSearchParams();
  const activeClientId = parseActiveClientId(
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value
  );
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(offset));
  if (search) queryParams.set("search", search);
  if (work_instruction_id) queryParams.set("work_instruction_id", String(work_instruction_id));
  if (activeClientId) queryParams.set("client_id", String(activeClientId));

  try {
    const res = await fetch(
      `${EXPRESS_BASE_URL}/reports?${queryParams.toString()}`,
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
      console.error("Failed to fetch inspection reports:", json.motive);
      return {
        reports: [],
        total: 0,
        loadError: {
          status: res.status,
          message: json.motive || "No fue posible cargar los reportes.",
        },
      };
    }

    return {
      reports: json.data ?? [],
      total: json.total ?? 0,
    };
  } catch (error) {
    console.error("Error fetching inspection reports:", error);
    return {
      reports: [],
      total: 0,
      loadError: { status: 503, message: "No fue posible cargar los reportes." },
    };
  }
}

export async function fetchReportDashboard(): Promise<IReportDashboard> {
  const emptyDashboard = { total_hours: 0, hours_history: [] };
  if (!EXPRESS_BASE_URL) {
    console.error("EXPRESS_BASE_URL is not defined");
    return {
      ...emptyDashboard,
      loadError: { status: 500, message: "No fue posible conectar con el servicio." },
    };
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) {
    console.error("No session cookie");
    return {
      ...emptyDashboard,
      loadError: { status: 401, message: "Tu sesión no está disponible." },
    };
  }

  const queryParams = new URLSearchParams();
  const activeClientId = parseActiveClientId(
    cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value
  );
  if (activeClientId) queryParams.set("client_id", String(activeClientId));

  try {
    const res = await fetch(
      `${EXPRESS_BASE_URL}/reports/dashboard?${queryParams.toString()}`,
      {
        method: "GET",
        headers: { Cookie: `session=${session}` },
        cache: "no-store",
      }
    );
    const json = await res.json();
    if (!res.ok || !json.success) {
      console.error("Failed to fetch report dashboard:", json.motive);
      return {
        ...emptyDashboard,
        loadError: {
          status: res.status,
          message: json.motive || "No fue posible cargar el resumen.",
        },
      };
    }
    return json.data ?? emptyDashboard;
  } catch (error) {
    console.error("Error fetching report dashboard:", error);
    return {
      ...emptyDashboard,
      loadError: { status: 503, message: "No fue posible cargar el resumen." },
    };
  }
}
