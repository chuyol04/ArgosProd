'use client'

import React, { useState, useEffect, useTransition } from 'react';
import Category from "./Category";
import { sitemapData } from '../data/sitemapData';
import { useUser } from '@/contexts/users/userContext';
import { Separator } from "@/components/ui/separator";
import { toggleFavoriteRoute } from '@/app/(protected)/favorite-routes/actions/favorite-routes.actions';
import PageContainer from "@/components/layout/PageContainer";
import { getFavoriteRoutes } from '@/app/(protected)/favorite-routes/data/favorite-routes.data';

const SiteMap: React.FC = () => {
    const { user } = useUser();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    // Fetch favorites on mount
    useEffect(() => {
        if (user) {
            getFavoriteRoutes()
                .then(favs => setFavorites(favs.map(f => f.route_id)))
                .catch(err => console.error("Failed to load favorites:", err));
        }
    }, [user]);

    const handleToggleFavorite = (routeId: string) => {
        // Optimistic update
        setFavorites(prev =>
            prev.includes(routeId)
                ? prev.filter(id => id !== routeId)
                : [...prev, routeId]
        );

        startTransition(async () => {
            const result = await toggleFavoriteRoute(routeId);
            if (!result.success) {
                // Revert on error
                setFavorites(prev =>
                    prev.includes(routeId)
                        ? prev.filter(id => id !== routeId)
                        : [...prev, routeId]
                );
                console.error("Failed to toggle favorite:", result.error);
            }
        });
    };

    // Don't render until user is loaded (prevents hydration mismatch)
    if (!user) {
        return null;
    }

    const isAdmin = user?.roles?.includes("Admin") ?? false;
    const ADMIN_ONLY_CATEGORIES = ["Administración"];
    const categories = isAdmin
        ? sitemapData
        : sitemapData.filter((cat) => !ADMIN_ONLY_CATEGORIES.includes(cat.name));

    return (
        <div className='flex flex-col'>
            {/* Header section - outside PageContainer */}
            <div className='flex flex-col gap-4 px-4 sm:px-6 lg:px-8 pt-4'>
                <div className='flex flex-row w-full items-center'>
                    <div className='flex w-2/3 items-center'>
                        <span className='text-2xl'>Site Map</span>
                    </div>
                </div>
                <Separator />
                <h2 className="text-2xl font-semibold tracking-tight">Available Routes</h2>
                <Separator />
            </div>

            {/* Content section - inside PageContainer */}
            <PageContainer>
                <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
                    {categories.map(category => (
                        <Category
                            key={category.name}
                            name={category.name}
                            routes={category.routes}
                            favorites={favorites}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                    {categories.length === 0 && (
                        <p className="text-muted-foreground">
                            No hay rutas disponibles.
                        </p>
                    )}
                </div>
            </PageContainer>
        </div>
    )
};

export default SiteMap;
