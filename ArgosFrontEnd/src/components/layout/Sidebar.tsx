"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { sitemapData } from "@/app/(protected)/sitemap/data/sitemapData";
import { useUser } from "@/contexts/users/userContext";
import { X, LogOut } from "lucide-react";

const ADMIN_ONLY_CATEGORIES = ["Administración"];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const router = useRouter();
    const { user } = useUser();

    const isAdmin = user?.roles?.includes("Admin") ?? false;

    const categories = useMemo(() => {
        if (isAdmin) return sitemapData;
        return sitemapData.filter(
            (cat) => !ADMIN_ONLY_CATEGORIES.includes(cat.name)
        );
    }, [isAdmin]);

    const handleNavigate = (path: string) => {
        router.push(path);
        onClose();
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 z-50 shadow-xl transform transition-transform duration-300 ${
                    isOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Navegación
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Categories */}
                <div className="overflow-y-auto h-[calc(100%-60px-56px)] p-4">
                    {categories.length > 0 ? (
                        categories.map(category => (
                            <div key={category.name} className="mb-6">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    {category.name}
                                </h3>
                                <ul className="space-y-1">
                                    {category.routes.map(route => (
                                        <li key={route.path}>
                                            <button
                                                onClick={() => handleNavigate(route.path)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                {route.name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            No hay rutas disponibles.
                        </p>
                    )}
                </div>

                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-900">
                    <button
                        onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            router.push("/login");
                            onClose();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </>
    );
}
