import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { getMongoClient } from "@/lib/db/mongoClient";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const client: MongoClient = await getMongoClient();
    const db = client.db("media");
    const collection = db.collection("fs.files");

    const filter = search
      ? { filename: { $regex: search, $options: "i" } }
      : {};

    const [rawFiles, total] = await Promise.all([
      collection
        .find(filter, {
          projection: { _id: 1, filename: 1, contentType: 1, metadata: 1, length: 1, uploadDate: 1 },
        })
        .sort({ uploadDate: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    // Normalize contentType from either top-level or metadata
    const files = rawFiles.map((f) => ({
      _id: f._id,
      filename: f.filename,
      contentType: f.contentType || f.metadata?.contentType || "application/octet-stream",
      length: f.length,
      uploadDate: f.uploadDate,
    }));

    return NextResponse.json({ files, total }, { status: 200 });
  } catch (err) {
    console.error("Error listing media:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
