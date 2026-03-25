"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const EXPRESS_BASE_URL = process.env.EXPRESS_BASE_URL;

export async function toggleFavoriteRoute(routeId: string): Promise<{ success: boolean; action: 'added' | 'removed'; error?: string }> {
    try {
        if (!EXPRESS_BASE_URL) {
            throw new Error("EXPRESS_BASE_URL is not defined");
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            throw new Error("No session cookie");
        }

        // First, get current favorites to check if route is already favorited
        const getFavRes = await fetch(`${EXPRESS_BASE_URL}/favorite-routes`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        if (!getFavRes.ok) {
            throw new Error("Failed to fetch favorites");
        }

        const { data: favorites } = await getFavRes.json();
        const isFavorited = favorites.some((fav: { route_id: string }) => fav.route_id === routeId);

        if (isFavorited) {
            // Remove from favorites
            const deleteRes = await fetch(`${EXPRESS_BASE_URL}/favorite-routes/${routeId}`, {
                method: 'DELETE',
                headers: {
                    'Cookie': `session=${session}`,
                },
            });

            if (!deleteRes.ok) {
                const errorData = await deleteRes.json();
                throw new Error(errorData.motive || "Failed to remove favorite");
            }

            revalidatePath('/sitemap');
            revalidatePath('/home');
            return { success: true, action: 'removed' };
        } else {
            // Add to favorites
            const addRes = await fetch(`${EXPRESS_BASE_URL}/favorite-routes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `session=${session}`,
                },
                body: JSON.stringify({ route_id: routeId }),
            });

            if (!addRes.ok) {
                const errorData = await addRes.json();
                throw new Error(errorData.motive || "Failed to add favorite");
            }

            revalidatePath('/sitemap');
            revalidatePath('/home');
            return { success: true, action: 'added' };
        }
    } catch (err) {
        console.error("Toggle favorite error:", err);
        return {
            success: false,
            action: 'added',
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}

export async function getFavoriteRouteIds(): Promise<string[]> {
    try {
        if (!EXPRESS_BASE_URL) {
            return [];
        }

        const cookieStore = await cookies();
        const session = cookieStore.get('session')?.value;

        if (!session) {
            return [];
        }

        const res = await fetch(`${EXPRESS_BASE_URL}/favorite-routes`, {
            method: 'GET',
            headers: {
                'Cookie': `session=${session}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            return [];
        }

        const { data: favorites } = await res.json();
        return favorites.map((fav: { route_id: string }) => fav.route_id);
    } catch (err) {
        console.error("Get favorites error:", err);
        return [];
    }
}
