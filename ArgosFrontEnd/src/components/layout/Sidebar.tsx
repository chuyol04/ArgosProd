"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getVisibleCategories } from "@/app/(protected)/sitemap/data/sitemapData";
import { useUser } from "@/contexts/users/userContext";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
    AlertTriangle, BriefcaseBusiness, ClipboardList, Compass, FileImage,
    FileText, Home, KeyRound, LogOut, PackageSearch, ShieldCheck, Users,
    Wrench, X, type LucideIcon,
} from "lucide-react";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

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

const linkStyle = "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const isClientOnly = user?.roles?.includes("Cliente") ?? false;
    const homePath = isClientOnly ? "/mis-reportes" : "/home";
    const categories = user ? getVisibleCategories(user.roles) : [];

    useEffect(() => {
        if (!isOpen) return;
        const desktop = window.matchMedia("(min-width: 1024px)");
        const closeOnDesktop = () => { if (desktop.matches) onClose(); };
        closeOnDesktop();
        desktop.addEventListener("change", closeOnDesktop);
        return () => desktop.removeEventListener("change", closeOnDesktop);
    }, [isOpen, onClose]);

    const isActive = (path: string) =>
        path === "/detalles-inspeccion/crear"
            ? pathname.startsWith("/detalles-inspeccion/")
            : pathname === path || (path !== "/home" && pathname.startsWith(path + "/"));

    const navigation = (
        <>
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
                <Link href={homePath} onClick={onClose} className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" aria-label="Ir al inicio">
                    <Image src="/logo.png" alt="OZCAB Group" width={118} height={44} className="h-11 w-auto object-contain" priority />
                </Link>
                <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white lg:hidden" aria-label="Cerrar menú">
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
            <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5">
                {!isClientOnly && (
                    <Link href="/home" onClick={onClose} aria-current={isActive("/home") ? "page" : undefined} className={linkStyle + " mb-5 font-medium " + (isActive("/home") ? "bg-primary text-primary-foreground" : "text-slate-200 hover:bg-white/10 hover:text-white")}>
                        <Home className="h-4 w-4" aria-hidden="true" />Inicio
                    </Link>
                )}
                {categories.map((category) => (
                    <section key={category.name} className="mb-6">
                        <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-300">{category.name}</h2>
                        <ul className="space-y-1">
                            {category.routes.map((route) => {
                                const Icon = ROUTE_ICONS[route.path] ?? FileText;
                                const active = isActive(route.path);
                                return (
                                    <li key={route.path}>
                                        <Link href={route.path} onClick={onClose} aria-current={active ? "page" : undefined} className={linkStyle + " " + (active ? "bg-primary text-primary-foreground" : "text-slate-200 hover:bg-white/10 hover:text-white")}>
                                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{route.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
                {!isClientOnly && (
                    <Link href="/sitemap" onClick={onClose} aria-current={isActive("/sitemap") ? "page" : undefined} className={linkStyle + " " + (isActive("/sitemap") ? "bg-primary text-primary-foreground" : "text-slate-200 hover:bg-white/10 hover:text-white")}>
                        <Compass className="h-4 w-4" aria-hidden="true" />Mapa del sitio
                    </Link>
                )}
            </nav>
            <div className="shrink-0 border-t border-white/10 p-3">
                <Link href="/cambiar-contrasena" onClick={onClose} aria-current={isActive("/cambiar-contrasena") ? "page" : undefined} className={linkStyle + " text-slate-200 hover:bg-white/10 hover:text-white"}>
                    <KeyRound className="h-4 w-4" aria-hidden="true" />Cambiar contraseña
                </Link>
                <button type="button" onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    router.push("/login");
                    onClose();
                }} className={linkStyle + " w-full text-red-300 hover:bg-red-500/10 hover:text-red-200"}>
                    <LogOut className="h-4 w-4" aria-hidden="true" />Cerrar sesión
                </button>
            </div>
        </>
    );

    return (
        <>
            <aside aria-label="Menú principal" className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#0f1a2d] text-white lg:flex">
                {navigation}
            </aside>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
                <DialogContent
                    id="mobile-navigation"
                    aria-describedby={undefined}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        document.getElementById("mobile-menu-trigger")?.focus();
                    }}
                    className="inset-y-0 left-0 top-0 flex h-dvh max-h-none w-[min(18rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-[#0f1a2d] p-0 text-white animate-none! [&>button]:hidden"
                >
                    <DialogTitle className="sr-only">Menú de navegación</DialogTitle>
                    {navigation}
                </DialogContent>
            </Dialog>
        </>
    );
}
