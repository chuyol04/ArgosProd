import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = req.cookies.get("session")?.value;

    if (!session) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    if (!EXPRESS_BASE_URL) {
      return NextResponse.json(
        { error: "EXPRESS_BASE_URL not configured" },
        { status: 500 }
      );
    }

    // Forward request to backend
    const backendRes = await fetch(`${EXPRESS_BASE_URL}/reports/${id}/export`, {
      method: "GET",
      headers: {
        Cookie: `session=${session}`,
      },
    });

    if (!backendRes.ok) {
      const error = await backendRes.json().catch(() => ({ motive: "Export failed" }));
      return NextResponse.json(
        { error: error.motive || "Failed to export report" },
        { status: backendRes.status }
      );
    }

    // Get the file content
    const buffer = await backendRes.arrayBuffer();

    // Get the filename from the backend response
    const contentDisposition = backendRes.headers.get("Content-Disposition");
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `Reporte_${id}.xlsx`;

    // Return the file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    console.error("Export report error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
