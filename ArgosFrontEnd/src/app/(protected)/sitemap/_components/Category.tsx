'use client'

import React from 'react';
import { useRouter } from "next/navigation";
import { ICategoryData } from '../types/sitemap.types';
import { Star } from 'lucide-react';

interface CategoryProps extends ICategoryData {
    favorites?: string[]; // Array of favorited route paths
    onToggleFavorite?: (routePath: string) => void;
    showStars?: boolean;
}

const Category: React.FC<CategoryProps> = ({
    name,
    routes,
    favorites = [],
    onToggleFavorite,
    showStars = true
}) => {
    const router = useRouter();

    const handleStarClick = (e: React.MouseEvent, routePath: string) => {
        e.stopPropagation();
        if (onToggleFavorite) {
            onToggleFavorite(routePath);
        }
    };

    return (
        <div className='flex flex-col w-full py-5'>
            <div><span className='font-bold text-xl'>{name}</span></div>
            {routes.map(route => {
                const isFavorite = favorites.includes(route.path);
                return (
                    <div key={route.path} className="flex items-center gap-2 group">
                        <button
                            onClick={() => router.push(route.path)}
                            className="text-base hover:text-blue-800 transition-colors"
                        >
                            {route.name}
                        </button>
                        {showStars && onToggleFavorite && (
                            <button
                                onClick={(e) => handleStarClick(e, route.path)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                            >
                                <Star
                                    className={`h-4 w-4 transition-colors ${
                                        isFavorite
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-400 hover:fill-yellow-400 hover:text-yellow-400'
                                    }`}
                                />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    )
};

export default Category;
