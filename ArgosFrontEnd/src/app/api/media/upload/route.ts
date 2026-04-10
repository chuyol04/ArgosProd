import { NextRequest, NextResponse } from "next/server";
import { MongoClient, GridFSBucket } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";
import { Readable } from "stream";
import type { ReadableStream } from "node:stream/web";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const file = incoming.get("file") as File | null;

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { message: "Campo 'file' faltante o inválido" },
        { status: 400 }
      );
    }

    const client: MongoClient = await getMongoClient();
    const db = client.db("media");
    const bucket = new GridFSBucket(db);

    const fileStream = file.stream();
    const readableStream = Readable.fromWeb(fileStream as ReadableStream<Uint8Array>);

    const uploadStream = bucket.openUploadStream(file.name, {
      metadata: { contentType: file.type },
    });

    const mediaId = await new Promise<string>((resolve, reject) => {
      readableStream
        .pipe(uploadStream)
        .on("error", (err) =>
          reject(new Error(`Error de GridFS durante la carga: ${err.message}`))
        )
        .on("finish", () => resolve(uploadStream.id.toString()));
    });

    return NextResponse.json({ status: "success", media_id: mediaId }, { status: 200 });
  } catch (err) {
    console.error("Error en /api/media/upload:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
