import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

function streamToWebStream(stream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });
}

type RouteParams = { params: Promise<{ media_id: string }> };

export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { media_id: mediaIdString } = await context.params;

    if (!ObjectId.isValid(mediaIdString)) {
      return NextResponse.json({ message: "ID de archivo no válido." }, { status: 400 });
    }

    const objectId = new ObjectId(mediaIdString);
    const client: MongoClient = await getMongoClient();
    const db = client.db("media");
    const bucket = new GridFSBucket(db);

    const fileDoc = await db.collection("fs.files").findOne({ _id: objectId });
    if (!fileDoc) {
      return NextResponse.json({ message: "Archivo no encontrado." }, { status: 404 });
    }

    const filename = fileDoc.filename || "file";
    const contentType = fileDoc.contentType || fileDoc.metadata?.contentType || "application/octet-stream";

    const downloadStream = bucket.openDownloadStream(objectId);
    const webStream = streamToWebStream(downloadStream);

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": fileDoc.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error viewing media:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
