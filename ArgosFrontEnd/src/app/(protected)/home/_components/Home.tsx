'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { ClipboardCheck, FileText } from 'lucide-react';
import Category from '@/app/(protected)/sitemap/_components/Category';
import { toggleFavoriteRoute } from '@/app/(protected)/favorite-routes/actions/favorite-routes.actions';
import { getFavoriteRoutes } from '@/app/(protected)/favorite-routes/data/favorite-routes.data';
import { getVisibleCategories } from '@/app/(protected)/sitemap/data/sitemapData';
import { useUser } from '@/contexts/users/userContext';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';

const WORKFLOW = [
    ['Reporte', 'Selecciona la instrucción de trabajo y crea el reporte.'],
    ['Detalle', 'Captura cajas, piezas y defectos del reporte.'],
    ['Revisión', 'Comprueba las cantidades y evidencias capturadas.'],
    ['Resultado', 'Consulta el resultado del reporte seleccionado.'],
    ['Excel', 'Descarga el archivo desde el reporte.'],
];

export default function Home() {
    const { user } = useUser();
    const [favoriteRouteIds, setFavoriteRouteIds] = useState<string[]>([]);
    const [favoritesLoading, setFavoritesLoading] = useState(true);
    const [favoriteError, setFavoriteError] = useState('');
    const [favoriteStatus, setFavoriteStatus] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!user) return;
        let active = true;
        setFavoritesLoading(true);
        setFavoriteRouteIds([]);
        setFavoriteError('');
        getFavoriteRoutes()
            .then((favorites) => { if (active) setFavoriteRouteIds(favorites.map((favorite) => favorite.route_id)); })
            .catch(() => { if (active) setFavoriteError('No pudimos cargar tus favoritos. Puedes usar el menú o el mapa del sitio.'); })
            .finally(() => { if (active) setFavoritesLoading(false); });
        return () => { active = false; };
    }, [user]);

    const categories = user ? getVisibleCategories(user.roles) : [];
    const favoritesByCategory = categories
        .map((category) => ({ ...category, routes: category.routes.filter((route) => favoriteRouteIds.includes(route.path)) }))
        .filter((category) => category.routes.length > 0);

    const handleRemoveFavorite = (routeId: string) => {
        if (isPending || favoritesLoading) return;
        const previousFavorites = favoriteRouteIds;
        setFavoriteError('');
        setFavoriteStatus('');
        setFavoriteRouteIds((current) => current.filter((id) => id !== routeId));
        startTransition(async () => {
            try {
                const result = await toggleFavoriteRoute(routeId);
                if (!result.success) throw new Error('favorite');
                setFavoriteStatus('Favorito eliminado.');
            } catch {
                setFavoriteRouteIds(previousFavorites);
                setFavoriteError('No se guardó el cambio. Tu favorito se ha conservado; intenta de nuevo.');
            }
        });
    };

    if (!user) return null;

    return (
        <PageContainer className="space-y-8">
            <section className="grid overflow-hidden rounded-2xl border bg-card lg:grid-cols-2">
                <div className="min-w-0 p-6 sm:p-8">
                    <h1 className="break-words text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Hola, {user.name || 'bienvenido'}</h1>
                    <p className="mt-3 max-w-prose text-pretty text-base leading-7 text-muted-foreground">Consulta tus reportes o continúa con la captura de una inspección.</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild size="lg"><Link href="/reportes-inspeccion"><FileText aria-hidden="true" />Reportes de inspección</Link></Button>
                        <Button asChild variant="outline" size="lg"><Link href="/detalles-inspeccion/crear"><ClipboardCheck aria-hidden="true" />Capturar detalle</Link></Button>
                    </div>
                </div>
                <div className="relative aspect-[1917/821] self-center bg-slate-900">
                    <Image src="/images/bannerozcabinspeccion.png" alt="Equipo de inspección de OZCAB" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" priority />
                </div>
            </section>

            <section aria-labelledby="favorites-heading" aria-busy={favoritesLoading || isPending}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="favorites-heading" className="text-xl font-semibold">Tus favoritos</h2>
                    <Button asChild variant="outline" size="sm"><Link href="/sitemap">Organizar favoritos</Link></Button>
                </div>
                {favoriteError && <p role="alert" className="mb-3 text-sm text-destructive">{favoriteError}</p>}
                <p role="status" className="text-sm text-muted-foreground">{favoritesLoading ? 'Cargando favoritos…' : isPending ? 'Guardando favorito…' : favoriteStatus}</p>
                {favoritesByCategory.length > 0 ? (
                    <div className="mt-3 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {favoritesByCategory.map((category) => <Category key={category.name} {...category} favorites={favoriteRouteIds} onToggleFavorite={handleRemoveFavorite} disabled={isPending || favoritesLoading} />)}
                    </div>
                ) : !favoritesLoading && !favoriteError && !isPending && (
                    <p className="text-sm text-muted-foreground">Agrega tus pantallas más usadas con la estrella del mapa del sitio.</p>
                )}
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-2">
                {categories.filter((category) => category.name !== 'Operación').map((category) => <Category key={category.name} {...category} showStars={false} />)}
            </div>

            <details className="rounded-xl border bg-card p-4 sm:p-5">
                <summary className="cursor-pointer rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">¿Cómo se completa una inspección?</summary>
                <ol className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {WORKFLOW.map(([title, description], index) => (
                        <li key={title} className="min-w-0 text-sm"><p className="font-semibold">{index + 1}. {title}</p><p className="mt-1 leading-6 text-muted-foreground">{description}</p></li>
                    ))}
                </ol>
                <p className="mt-4 text-sm text-muted-foreground">La revisión, los resultados y la exportación se consultan dentro del reporte seleccionado.</p>
            </details>
        </PageContainer>
    );
}
