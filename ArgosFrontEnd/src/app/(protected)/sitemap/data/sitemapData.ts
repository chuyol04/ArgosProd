// front/src/app/sitemap/data/sitemapData.ts
import mapData from "../types/map.json";

export interface ISitemapRoute {
    name: string;
    path: string;
}

export interface ISitemapCategory {
    name: string;
    routes: ISitemapRoute[];
}

export const sitemapData: ISitemapCategory[] = mapData.categories;

// Navigation visibility mirrors the existing role policy; the server enforces access.
export function getVisibleCategories(roles: string[]): ISitemapCategory[] {
    if (roles.includes("Cliente")) {
        return [{ name: "Mi cuenta", routes: [{ name: "Mis reportes", path: "/mis-reportes" }] }];
    }
    return roles.includes("Admin")
        ? sitemapData
        : sitemapData.filter((category) => category.name !== "Administración");
}

// Build a lookup map for quick path -> route info resolution
const routeMap = new Map<string, ISitemapRoute>();
for (const category of sitemapData) {
    for (const route of category.routes) {
        routeMap.set(route.path, route);
    }
}

// Get route info by path
export function getRouteByPath(path: string): ISitemapRoute | undefined {
    return routeMap.get(path);
}

// Get all routes as a flat array
export function getAllRoutes(): ISitemapRoute[] {
    return Array.from(routeMap.values());
}
