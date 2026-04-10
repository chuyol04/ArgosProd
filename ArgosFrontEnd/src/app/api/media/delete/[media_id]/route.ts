import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ media_id: string }> };

export async function DELETE(req: NextRequest, context: RouteParams) {
  try {
    const { media_id: mediaIdString } = await context.params;

    if (!ObjectId.isValid(mediaIdString)) {
      return NextResponse.json({ message: "ID de archivo no válido." }, { status: 400 });
    }

    const objectId = new ObjectId(mediaIdString);
    const client: MongoClient = await getMongoClient();
    const db = client.db("media");
    const bucket = new GridFSBucket(db);

    await bucket.delete(objectId);

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting media:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
