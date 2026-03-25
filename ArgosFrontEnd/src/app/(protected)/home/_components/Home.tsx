'use client'

import React from 'react';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { useUser } from '@/contexts/users/userContext';
import Category from '@/app/(protected)/sitemap/_components/Category';
import { Separator } from "@/components/ui/separator";
import { getFavoriteRoutes } from '@/app/(protected)/favorite-routes/data/favorite-routes.data';
import PageContainer from "@/components/layout/PageContainer";
import { sitemapData } from '@/app/(protected)/sitemap/data/sitemapData';
import { toggleFavoriteRoute } from '@/app/(protected)/favorite-routes/actions/favorite-routes.actions';
import { ICategoryData } from '@/app/(protected)/sitemap/types/sitemap.types';

export default function Home() {
    const [time, setTime] = useState<Date | null>(null);
    const { user } = useUser();
    const [hasMounted, setHasMounted] = useState(false);
    const [favoriteRouteIds, setFavoriteRouteIds] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setHasMounted(true);
        setTime(new Date());
        const iv = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        if (user) {
            getFavoriteRoutes()
                .then(favs => setFavoriteRouteIds(favs.map(f => f.route_id)))
                .catch(err => console.error("Failed to load favorite routes:", err));
        }
    }, [user]);

    const handleRemoveFavorite = (routeId: string) => {
        // Optimistic update - remove from list
        setFavoriteRouteIds(prev => prev.filter(id => id !== routeId));

        startTransition(async () => {
            const result = await toggleFavoriteRoute(routeId);
            if (!result.success) {
                // Revert on error - add back
                setFavoriteRouteIds(prev => [...prev, routeId]);
                console.error("Failed to remove favorite:", result.error);
            }
        });
    };

    // Group favorites by category from sitemapData
    // Role-based filtering will be added later
    const favoritesByCategory = useMemo(() => {
        if (!user) return [];

        const categories: ICategoryData[] = [];

        sitemapData.forEach(category => {
            const favoritedRoutes = category.routes.filter(route =>
                favoriteRouteIds.includes(route.path)
            );

            if (favoritedRoutes.length > 0) {
                categories.push({
                    name: category.name,
                    routes: favoritedRoutes
                });
            }
        });

        return categories;
    }, [favoriteRouteIds, user]);

    if (!user) {
        return null;
    }

    return (
        <div className='flex flex-col'>
            {/* Header section - outside PageContainer */}
            <div className='flex flex-col gap-4  pt-4'>
                <div className='flex flex-row w-full items-center px-4 sm:px-6 lg:px-8'>
                    <div className='flex w-2/3 items-center'>
                        <span className='text-2xl'>{user?.name}</span>
                    </div>
                    <div className='flex w-1/3'>
                        {hasMounted && time ? (
                            <span className="text-2xl font-mono font-thin text-[#005B94]">
                                {time.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                })}
                            </span>
                        ) : (
                            <span className="text-2xl font-mono">--:--:--</span>
                        )}
                    </div>
                </div>
                <Separator />
                <h2 className="text-2xl font-semibold tracking-tight px-4 sm:px-6 lg:px-8">Favoritos</h2>
                <Separator />
            </div>

            {/* Content section - inside PageContainer */}
            <PageContainer>
                <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
                    {favoritesByCategory.length > 0 ? (
                        favoritesByCategory.map(category => (
                            <Category
                                key={category.name}
                                name={category.name}
                                routes={category.routes}
                                favorites={favoriteRouteIds}
                                onToggleFavorite={handleRemoveFavorite}
                                showStars={true}
                            />
                        ))
                    ) : (
                        <p className="text-muted-foreground">
                            No tienes rutas favoritas. Ve al sitemap para agregar algunas.
                        </p>
                    )}
                </div>
            </PageContainer>
        </div>
    )
};
