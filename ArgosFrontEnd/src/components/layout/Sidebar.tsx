"use client";

import Image from "next/image";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { sitemapData } from "@/app/(protected)/sitemap/data/sitemapData";
import { useUser } from "@/contexts/users/userContext";
import {
    AlertTriangle,
    BriefcaseBusiness,
    ClipboardList,
    FileImage,
    FileText,
    Home,
    KeyRound,
    LogOut,
    PackageSearch,
    ShieldCheck,
    Users,
    Wrench,
    X,
    type LucideIcon,
} from "lucide-react";

const ADMIN_ONLY_CATEGORIES = ["Administración"];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const CLIENT_PORTAL_CATEGORY = {
    name: "Mi cuenta",
    routes: [{ name: "Mis reportes", path: "/mis-reportes" }],
};

const ROUTE_ICONS: Record<string, LucideIcon> = {
    "/reportes-inspeccion": FileText,
    "/detalles-inspeccion/crear": ClipboardList,
    "/clients": Users,
    "/services": BriefcaseBusiness,
    "/parts": Wrench,
    "/defects": AlertTriangle,
    "/instrucciones-trabajo": PackageSearch,
    "/users": Users,
    "/roles": ShieldCheck,
    "/media": FileImage,
    "/mis-reportes": FileText,
};

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();

    const isAdmin = user?.roles?.includes("Admin") ?? false;
    const isClientOnly = user?.roles?.includes("Cliente") ?? false;
    const homePath = isClientOnly ? "/mis-reportes" : "/home";

    const categories = useMemo(() => {
        if (!user) return [];
        if (isClientOnly) return [CLIENT_PORTAL_CATEGORY];
        if (isAdmin) return sitemapData;
        return sitemapData.filter(
            (category) => !ADMIN_ONLY_CATEGORIES.includes(category.name)
        );
    }, [user, isAdmin, isClientOnly]);

    const handleNavigate = (path: string) => {
        router.push(path);
        onClose();
    };

    const isActive = (path: string) =>
        pathname === path || (path !== "/home" && pathname.startsWith(`${path}/`));

    return (
        <>
            <button
                type="button"
                aria-label="Cerrar menú"
                className={`fixed inset-0 z-40 bg-slate-950/60 transition-opacity lg:hidden ${
                    isOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0f1a2d] text-white shadow-xl transition-transform duration-300 lg:w-64 lg:translate-x-0 ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
                    <button
                        type="button"
                        onClick={() => handleNavigate(homePath)}
                        className="rounded-md transition-opacity hover:opacity-85"
                        aria-label="Ir al inicio"
                    >
                        <Image
                            src="/logo.png"
                            alt="OZCAB Group"
                            width={118}
                            height={44}
                            className="h-11 w-auto object-contain"
                            priority
                        />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
                        aria-label="Cerrar menú"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-5">
                    {!isClientOnly && (
                        <button
                            type="button"
                            onClick={() => handleNavigate("/home")}
                            className={`mb-5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                                isActive("/home")
                                    ? "bg-orange-500 text-white shadow-sm"
                                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <Home className="h-4 w-4" />
                            Inicio
                        </button>
                    )}

                    {categories.map((category) => (
                        <section key={category.name} className="mb-6">
                            <h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {category.name}
                            </h2>
                            <ul className="space-y-1">
                                {category.routes.map((route) => {
                                    const Icon = ROUTE_ICONS[route.path] ?? FileText;
                                    const active = isActive(route.path);

                                    return (
                                        <li key={route.path}>
                                            <button
                                                type="button"
                                                onClick={() => handleNavigate(route.path)}
                                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                                                    active
                                                        ? "bg-orange-500 text-white shadow-sm"
                                                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                                                }`}
                                            >
                                                <Icon className="h-4 w-4 shrink-0" />
                                                <span>{route.name}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </nav>

                <div className="shrink-0 border-t border-white/10 p-3">
                    <button
                        type="button"
                        onClick={() => handleNavigate("/cambiar-contrasena")}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                        <KeyRound className="h-4 w-4" />
                        Cambiar contraseña
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            await fetch("/api/auth/logout", { method: "POST" });
                            router.push("/login");
                            onClose();
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    );
}
