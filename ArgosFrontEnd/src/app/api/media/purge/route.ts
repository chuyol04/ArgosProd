import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/purge
 * Body: { media_ids: string[] }
 *
 * Fully deletes media: clears all MySQL references, then removes from GridFS.
 * Used by the Media management page for clean deletion.
 */
export async function POST(req: NextRequest) {
  try {
    const { media_ids } = await req.json();

    if (!Array.isArray(media_ids) || media_ids.length === 0) {
      return NextResponse.json(
        { message: "media_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate all IDs
    for (const id of media_ids) {
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return NextResponse.json(
          { message: `Invalid ObjectId: ${id}` },
          { status: 400 }
        );
      }
    }

    const client: MongoClient = await getMongoClient();

    // 1. Clean MySQL references via the Express backend
    //    We call the backend's internal cleanup endpoint
    const expressUrl = process.env.EXPRESS_BASE_URL;
    if (expressUrl) {
      // Forward session cookie from the incoming request
      const cookieHeader = req.headers.get("cookie") || "";
      try {
        await fetch(`${expressUrl}/media/cleanup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookieHeader,
          },
          body: JSON.stringify({ media_ids }),
        });
      } catch (err) {
        console.error("MySQL cleanup call failed (continuing with GridFS delete):", err);
      }
    }

    // 2. Delete from GridFS
    const db = client.db("media");
    const bucket = new GridFSBucket(db);
    const errors: string[] = [];
    let deleted = 0;

    for (const id of media_ids) {
      try {
        await bucket.delete(new ObjectId(id));
        deleted++;
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ status: "success", deleted, errors }, { status: 200 });
  } catch (err) {
    console.error("Error in /api/media/purge:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
