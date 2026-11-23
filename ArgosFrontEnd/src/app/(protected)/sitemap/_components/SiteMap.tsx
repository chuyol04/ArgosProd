'use client';

import { useState, useEffect, useTransition } from 'react';
import Category from './Category';
import { getVisibleCategories } from '../data/sitemapData';
import { useUser } from '@/contexts/users/userContext';
import { toggleFavoriteRoute } from '@/app/(protected)/favorite-routes/actions/favorite-routes.actions';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { getFavoriteRoutes } from '@/app/(protected)/favorite-routes/data/favorite-routes.data';

export default function SiteMap() {
    const { user } = useUser();
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [reload, setReload] = useState(0);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!user) return;
        let active = true;
        setLoading(true);
        setLoadFailed(false);
        setError('');
        setFavorites([]);
        getFavoriteRoutes()
            .then((favs) => { if (active) setFavorites(favs.map((fav) => fav.route_id)); })
            .catch(() => {
                if (active) {
                    setLoadFailed(true);
                    setError('No pudimos cargar tus favoritos. Los accesos a las pantallas siguen disponibles.');
                }
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [user, reload]);

    const handleToggleFavorite = (routeId: string) => {
        if (isPending || loading || loadFailed) return;
        const previousFavorites = favorites;
        setError('');
        setStatus('');
        setFavorites((previous) => previous.includes(routeId)
            ? previous.filter((id) => id !== routeId)
            : [...previous, routeId]);
        startTransition(async () => {
            try {
                const result = await toggleFavoriteRoute(routeId);
                if (!result.success) throw new Error('favorite');
                setStatus(result.action === 'added' ? 'Favorito agregado.' : 'Favorito eliminado.');
            } catch {
                setFavorites(previousFavorites);
                setError('No se guardó el cambio. Tus favoritos se han restaurado; intenta de nuevo.');
            }
        });
    };

    if (!user) return null;
    const categories = getVisibleCategories(user.roles);

    return (
        <PageContainer className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Mapa del sitio</h1>
                <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">Abre una pantalla o marca la estrella para tenerla a mano en tus favoritos de Inicio.</p>
            </div>
            <div aria-busy={loading || isPending}>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {loadFailed && <Button variant="outline" size="sm" className="mt-3" onClick={() => setReload((value) => value + 1)}>Reintentar favoritos</Button>}
                <p role="status" className="text-sm text-muted-foreground">{loading ? 'Cargando favoritos…' : isPending ? 'Guardando favorito…' : status}</p>
            </div>
            <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                    <Category key={category.name} {...category} favorites={favorites} onToggleFavorite={handleToggleFavorite} disabled={isPending || loading || loadFailed} />
                ))}
                {categories.length === 0 && <p className="text-sm text-muted-foreground">No hay pantallas disponibles para tu cuenta.</p>}
            </div>
        </PageContainer>
    );
}
