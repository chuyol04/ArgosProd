"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Compass, Menu } from "lucide-react";
import { useUser } from "@/contexts/users/userContext";

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const router = useRouter();
    const { user } = useUser();
    const isClientOnly = user?.roles?.includes("Cliente") ?? false;
    const homePath = isClientOnly ? "/mis-reportes" : "/home";
    const initials = user?.name
        ?.split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() ?? "OZ";

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
