import { cookies } from "next/headers";
import { IInspectionReportsResponse } from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";

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
    return { reports: [], total: 0 };
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  if (!session) {
    console.error("No session cookie");
    return { reports: [], total: 0 };
  }

  const offset = (page - 1) * limit;
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(offset));
  if (search) queryParams.set("search", search);
  if (work_instruction_id) queryParams.set("work_instruction_id", String(work_instruction_id));

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
      return { reports: [], total: 0 };
    }

    return {
      reports: json.data ?? [],
      total: json.total ?? 0,
    };
  } catch (error) {
    console.error("Error fetching inspection reports:", error);
    return { reports: [], total: 0 };
  }
}
