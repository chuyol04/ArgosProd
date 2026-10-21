import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";
import { getAuthorizedMediaIds } from "@/lib/storage/mediaAuthorization";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { media_ids } = await req.json();

    if (!Array.isArray(media_ids) || media_ids.length === 0 || media_ids.length > 100) {
      return NextResponse.json(
        { message: "El campo 'media_ids' debe contener entre 1 y 100 elementos." },
        { status: 400 }
      );
    }

    const normalizedIds: string[] = [];
    for (const idString of media_ids) {
      if (typeof idString !== "string" || !ObjectId.isValid(idString)) {
        return NextResponse.json(
          { message: `El identificador '${idString}' no es un ObjectId válido.` },
          { status: 400 }
        );
      }
      normalizedIds.push(idString.toLowerCase());
    }

    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ message: "No autorizado." }, { status: 401 });
    }
    const authorizedIds = await getAuthorizedMediaIds(session, normalizedIds);
    const objectIds = normalizedIds
      .filter((id) => authorizedIds.has(id))
      .map((id) => new ObjectId(id));
    if (objectIds.length === 0) {
      return NextResponse.json([], { status: 200 });
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
