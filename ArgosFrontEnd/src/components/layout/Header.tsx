"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Building2, Compass, Menu } from "lucide-react";
import { useUser } from "@/contexts/users/userContext";
import { ACTIVE_CLIENT_COOKIE } from "@/lib/clientScope";

interface HeaderProps {
    onMenuClick: () => void;
    menuOpen: boolean;
}

export default function Header({ onMenuClick, menuOpen }: HeaderProps) {
    const router = useRouter();
    const { user } = useUser();
    const isClientOnly = user?.roles?.includes("Cliente") ?? false;
    const canSelectClient = user?.roles?.some(
        (role) => role === "Admin" || role === "Manager" || role === "Inspector"
    ) ?? false;
    const homePath = isClientOnly ? "/mis-reportes" : "/home";
    const [activeClientId, setActiveClientId] = useState("all");
    const [isChangingClient, startClientTransition] = useTransition();
    const clientOptions = user?.client_options ?? [];
    const initials = user?.name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "OZ";

    useEffect(() => {
        setActiveClientId(user?.active_client_id ? String(user.active_client_id) : "all");
    }, [user?.active_client_id]);

    const handleClientChange = (value: string) => {
        setActiveClientId(value);
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie =
            value === "all"
                ? `${ACTIVE_CLIENT_COOKIE}=; Path=/; SameSite=Lax; Max-Age=0${secure}`
                : `${ACTIVE_CLIENT_COOKIE}=${value}; Path=/; SameSite=Lax${secure}`;

        startClientTransition(() => {
            if (window.location.search) {
                router.replace(window.location.pathname);
            } else {
                router.refresh();
            }
        });
    };

    return (
        <header className="sticky top-0 z-30 flex min-h-20 flex-wrap items-center gap-x-3 gap-y-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                    id="mobile-menu-trigger"
                    type="button"
                    onClick={onMenuClick}
                    className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
                    aria-label="Abrir menú"
                    aria-expanded={menuOpen}
                    aria-controls="mobile-navigation"
                    aria-haspopup="dialog"
                >
                    <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
                <Link href={homePath} aria-label="Ir al inicio" className="min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                    <Image src="/logo.png" alt="OZCAB Group" width={92} height={34} className="h-9 w-auto object-contain xl:hidden" priority />
                    <span className="hidden truncate text-lg font-semibold text-slate-900 xl:block">OZCAB Sorting Inspección</span>
                </Link>
            </div>

            <div className="ml-auto flex items-center gap-3">
                {!isClientOnly && (
                    <Link href="/sitemap" aria-label="Mapa del sitio" title="Mapa del sitio" className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:block">
                        <Compass className="h-5 w-5" aria-hidden="true" />
                    </Link>
                )}
                <div className="flex min-w-0 items-center gap-2.5">
                    <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{initials}</div>
                    <div className="hidden xl:block">
                        <p className="max-w-40 truncate text-sm font-semibold text-slate-900" title={user?.name}>{user?.name ?? "Usuario"}</p>
                        <p className="text-xs text-slate-600">{user?.roles?.[0] ?? ""}</p>
                    </div>
                    <span className="sr-only xl:hidden">{user?.name ?? "Usuario"}</span>
                </div>
            </div>

            {canSelectClient && (
                <label className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="sr-only">Cliente activo</span>
                    <select
                        value={activeClientId}
                        onChange={(event) => handleClientChange(event.target.value)}
                        disabled={isChangingClient}
                        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 sm:w-44 sm:text-sm xl:w-56"
                        aria-label="Cliente activo"
                        aria-busy={isChangingClient}
                    >
                        <option value="all">Todos los clientes</option>
                        {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                </label>
            )}
        </header>
    );
}
