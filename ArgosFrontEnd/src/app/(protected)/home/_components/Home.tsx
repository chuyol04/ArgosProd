'use client'

import React from 'react';
import Link from 'next/link';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { useUser } from '@/contexts/users/userContext';
import Category from '@/app/(protected)/sitemap/_components/Category';
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFavoriteRoutes } from '@/app/(protected)/favorite-routes/data/favorite-routes.data';
import PageContainer from "@/components/layout/PageContainer";
import { sitemapData } from '@/app/(protected)/sitemap/data/sitemapData';
import { toggleFavoriteRoute } from '@/app/(protected)/favorite-routes/actions/favorite-routes.actions';
import { ICategoryData } from '@/app/(protected)/sitemap/types/sitemap.types';
import {
    Users,
    Briefcase,
    ClipboardList,
    FileText,
    PackageSearch,
    Wrench,
    AlertTriangle,
    UserCog,
    ShieldCheck,
    Image as ImageIcon,
    ArrowRight,
    type LucideIcon,
} from 'lucide-react';

interface IQuickAccessItem {
    step: number;
    title: string;
    description: string;
    path: string;
    icon: LucideIcon;
    adminOnly?: boolean;
}

// "Flujo principal" of the system, in the order it's actually used day to
// day. Admin sees everything; everyone else (Manager/Inspector) sees the
// same set minus the admin-only cards - mirrors the existing Sidebar logic
// (only "Administración" is gated). Clients never reach this page at all -
// middleware.ts already redirects role 'Cliente' straight to /mis-reportes.
const QUICK_ACCESS_ITEMS: IQuickAccessItem[] = [
    {
        step: 1,
        title: "Clientes",
        description: "Alta y consulta de clientes.",
        path: "/clients",
        icon: Users,
    },
    {
        step: 2,
        title: "Servicios",
        description: "Servicios asociados a cada cliente.",
        path: "/services",
        icon: Briefcase,
    },
    {
        step: 3,
        title: "Instrucciones de Trabajo",
        description: "Crear instrucciones de trabajo y cargar documentos/IT.",
        path: "/instrucciones-trabajo",
        icon: ClipboardList,
    },
    {
        step: 4,
        title: "Reportes de Inspección",
        description: "Crear, consultar y exportar reportes de inspección.",
        path: "/reportes-inspeccion",
        icon: FileText,
    },
    {
        step: 5,
        title: "Detalles de Inspección",
        description: "Capturar cajas, piezas inspeccionadas, rechazos y defectos.",
        path: "/detalles-inspeccion/crear",
        icon: PackageSearch,
    },
    {
        step: 6,
        title: "Piezas",
        description: "Catálogo de piezas, si aplica.",
        path: "/parts",
        icon: Wrench,
    },
    {
        step: 6,
        title: "Defectos",
        description: "Catálogo de defectos, si aplica.",
        path: "/defects",
        icon: AlertTriangle,
    },
    {
        step: 7,
        title: "Usuarios",
        description: "Administración de usuarios.",
        path: "/users",
        icon: UserCog,
        adminOnly: true,
    },
    {
        step: 7,
        title: "Roles",
        description: "Administración de roles.",
        path: "/roles",
        icon: ShieldCheck,
        adminOnly: true,
    },
    {
        step: 7,
        title: "Media",
        description: "Administración de archivos.",
        path: "/media",
        icon: ImageIcon,
        adminOnly: true,
    },
];

function QuickAccessCard({ item }: { item: IQuickAccessItem }) {
    const Icon = item.icon;
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                            Paso {item.step}
                        </span>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <CardDescription>{item.description}</CardDescription>
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline" className="w-full justify-between">
                    <Link href={item.path}>
                        Ir a {item.title}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

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

    const isAdmin = user?.roles?.includes("Admin") ?? false;

    const visibleQuickAccessItems = useMemo(
        () => QUICK_ACCESS_ITEMS.filter((item) => !item.adminOnly || isAdmin),
        [isAdmin]
    );

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
                <div className='flex flex-col sm:flex-row w-full items-start sm:items-center gap-1 sm:gap-0 px-4 sm:px-6 lg:px-8'>
                    <div className='flex flex-1 min-w-0 items-center'>
                        <span className='text-xl sm:text-2xl truncate'>{user?.name}</span>
                    </div>
                    <div className='flex shrink-0'>
                        {hasMounted && time ? (
                            <span className="text-xl sm:text-2xl font-mono font-thin text-[#005B94]">
                                {time.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                })}
                            </span>
                        ) : (
                            <span className="text-xl sm:text-2xl font-mono">--:--:--</span>
                        )}
                    </div>
                </div>
                <Separator />
                <h2 className="text-2xl font-semibold tracking-tight px-4 sm:px-6 lg:px-8">Accesos Rápidos</h2>
                <Separator />
            </div>

            {/* Content section - inside PageContainer */}
            <PageContainer>
                <div className="flex flex-col gap-8">
                    {/* Flujo Principal - friendly dashboard, replaces the old empty-favorites message */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleQuickAccessItems.map((item) => (
                            <QuickAccessCard key={item.path} item={item} />
                        ))}
                    </div>

                    {/* Favoritos - only shown when the user actually has some starred */}
                    {favoritesByCategory.length > 0 && (
                        <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
                            <h3 className="text-lg font-semibold tracking-tight mb-3">Favoritos</h3>
                            {favoritesByCategory.map(category => (
                                <Category
                                    key={category.name}
                                    name={category.name}
                                    routes={category.routes}
                                    favorites={favoriteRouteIds}
                                    onToggleFavorite={handleRemoveFavorite}
                                    showStars={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PageContainer>
        </div>
    )
};
