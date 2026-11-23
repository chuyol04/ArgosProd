'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { ICategoryData } from '../types/sitemap.types';
import { Button } from '@/components/ui/button';

interface CategoryProps extends ICategoryData {
    favorites?: string[];
    onToggleFavorite?: (routePath: string) => void;
    showStars?: boolean;
    disabled?: boolean;
}

export default function Category({ name, routes, favorites = [], onToggleFavorite, showStars = true, disabled = false }: CategoryProps) {
    return (
        <section className="min-w-0">
            <h2 className="mb-3 text-lg font-semibold text-foreground">{name}</h2>
            <ul className="divide-y rounded-xl border bg-card">
                {routes.map((route) => {
                    const isFavorite = favorites.includes(route.path);
                    const favoriteLabel = (isFavorite ? 'Quitar ' : 'Agregar ') + route.name + (isFavorite ? ' de favoritos' : ' a favoritos');
                    return (
                        <li key={route.path} className="flex min-w-0 items-center gap-2 px-3">
                            <Link href={route.path} className="min-w-0 flex-1 break-words rounded-md py-3 text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                                {route.name}
                            </Link>
                            {showStars && onToggleFavorite && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={disabled}
                                    onClick={() => onToggleFavorite(route.path)}
                                    aria-pressed={isFavorite}
                                    aria-label={favoriteLabel}
                                >
                                    <Star aria-hidden="true" className={isFavorite ? 'fill-amber-700 text-amber-700' : 'text-muted-foreground'} />
                                </Button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
