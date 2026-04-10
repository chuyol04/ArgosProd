import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { media_ids } = await req.json();

    if (!Array.isArray(media_ids) || media_ids.length === 0) {
      return NextResponse.json(
        { message: "El campo 'media_ids' debe ser un array no vacío." },
        { status: 400 }
      );
    }

    const objectIds: ObjectId[] = [];
    for (const idString of media_ids) {
      if (typeof idString !== "string" || !ObjectId.isValid(idString)) {
        return NextResponse.json(
          { message: `El identificador '${idString}' no es un ObjectId válido.` },
          { status: 400 }
        );
      }
      objectIds.push(new ObjectId(idString));
    }

    const client: MongoClient = await getMongoClient();
    const db = client.db("media");

    const rawFiles = await db
      .collection("fs.files")
      .find(
        { _id: { $in: objectIds } },
        { projection: { _id: 1, filename: 1, contentType: 1, metadata: 1 } }
      )
      .toArray();

    const files = rawFiles.map((f) => ({
      _id: f._id,
      filename: f.filename,
      contentType: f.contentType || f.metadata?.contentType || "application/octet-stream",
    }));

    return NextResponse.json(files, { status: 200 });
  } catch (err) {
    console.error("Error getting media info:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
