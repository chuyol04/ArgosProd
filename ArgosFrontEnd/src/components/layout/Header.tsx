"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Building2, Compass, Menu } from "lucide-react";
import { useUser } from "@/contexts/users/userContext";
import { ACTIVE_CLIENT_COOKIE } from "@/lib/clientScope";

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const router = useRouter();
    const { user } = useUser();
    const isClientOnly = user?.roles?.includes("Cliente") ?? false;
    const isAdmin = user?.roles?.includes("Admin") ?? false;
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
        <header className="sticky top-0 z-30 flex h-20 items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
            <button
                type="button"
                onClick={onMenuClick}
                className="mr-3 rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
                aria-label="Abrir menú"
            >
                <Menu className="h-6 w-6" />
            </button>

            <button
                type="button"
                onClick={() => router.push(homePath)}
                className="flex min-w-0 items-center gap-3 text-left"
            >
                <Image
                    src="/logo.png"
                    alt="OZCAB Group"
                    width={92}
                    height={34}
                    className="h-9 w-auto object-contain lg:hidden"
                    priority
                />
                <span className="hidden truncate text-lg font-semibold text-slate-900 sm:block">
                    OZCAB Sorting Inspección
                </span>
            </button>

            <div className="ml-auto flex items-center gap-2 sm:gap-4">
                {isAdmin && (
                    <label className="flex min-w-0 items-center gap-2">
                        <Building2 className="hidden h-4 w-4 shrink-0 text-orange-500 sm:block" />
                        <span className="sr-only">Cliente activo</span>
                        <select
                            value={activeClientId}
                            onChange={(event) => handleClientChange(event.target.value)}
                            disabled={isChangingClient}
                            className="h-10 max-w-40 rounded-lg border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 sm:max-w-56 sm:px-3"
                            aria-label="Cliente activo"
                        >
                            <option value="all">Todos los clientes</option>
                            {clientOptions.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                {!isClientOnly && (
                    <button
                        type="button"
                        onClick={() => router.push("/sitemap")}
                        className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:flex"
                    >
                        <Compass className="h-4 w-4" />
                        Mapa del sitio
                    </button>
                )}
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                        {initials}
                    </div>
                    <div className="hidden sm:block">
                        <p className="max-w-44 truncate text-sm font-semibold text-slate-900">
                            {user?.name ?? "Usuario"}
                        </p>
                        <p className="text-xs text-slate-500">
                            {user?.roles?.[0] ?? ""}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}
