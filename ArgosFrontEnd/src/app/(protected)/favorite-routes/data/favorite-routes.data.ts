import { IFavoriteRoute } from "@/app/(protected)/favorite-routes/types/favorite-routes.types";

// Client-side: fetches favorite routes via API route (cookie sent automatically)
export async function getFavoriteRoutes(): Promise<IFavoriteRoute[]> {
    const res = await fetch('/api/favorite-routes', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('Failed to fetch favorite routes');
    }

    const data = await res.json();
    return data.data;
}

// Client-side: adds a route to favorites
export async function addFavoriteRoute(route_id: string): Promise<{ success: boolean; id?: number; motive?: string }> {
    const res = await fetch('/api/favorite-routes', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ route_id }),
    });

    return res.json();
}

// Client-side: removes a route from favorites
export async function removeFavoriteRoute(route_id: string): Promise<{ success: boolean; motive?: string }> {
    const res = await fetch(`/api/favorite-routes/${route_id}`, {
        method: 'DELETE',
        credentials: 'include',
    });

    return res.json();
}
