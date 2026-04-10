"use server";

/**
 * Delete a media file from MongoDB GridFS if the value is a valid media_id.
 * Silently skips if the value is null, empty, or not an ObjectId format.
 */
export async function deleteMediaIfExists(mediaIdOrUrl: string | null | undefined): Promise<void> {
    if (!mediaIdOrUrl) return;
    // Only delete if it looks like a MongoDB ObjectId (24-char hex)
    if (!/^[a-f0-9]{24}$/.test(mediaIdOrUrl)) return;

    try {
        const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await fetch(`${origin}/api/media/delete/${mediaIdOrUrl}`, {
            method: "DELETE",
        });
    } catch (err) {
        console.error("Failed to delete media from GridFS:", mediaIdOrUrl, err);
    }
}
