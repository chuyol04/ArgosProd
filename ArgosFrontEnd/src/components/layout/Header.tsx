"use client";

import { RxHamburgerMenu } from "react-icons/rx";
import { FaRegCompass } from "react-icons/fa6";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@/contexts/users/userContext";

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const router = useRouter();
    const { user } = useUser();
    const isClientOnly = user?.roles?.includes("Cliente") ?? false;
    const homePath = isClientOnly ? "/mis-reportes" : "/home";

    return (
        <header className="flex flex-row w-full px-3 sm:px-4 h-[60px] sm:h-[70px] bg-gray-900 sticky top-0 z-30 items-center">
            <div className="flex-1 flex flex-row items-center min-w-0">
                <button onClick={() => router.push(homePath)} className="hover:opacity-80 transition-opacity">
                    <Image
                        src="/logo.png"
                        alt="OzCab Group"
                        width={120}
                        height={40}
                        className="h-8 sm:h-10 w-auto object-contain"
                        priority
                    />
                </button>
            </div>
            <div className="flex flex-row justify-end items-center gap-1.5 sm:gap-2 lg:gap-4">
                <button
                    className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
                    onClick={() => router.push(homePath)}
                    aria-label="Home"
                >
                    <span className="hidden sm:inline font-semibold text-sm text-white">Página principal</span>
                    <Home size={22} color="white" />
                </button>
                {!isClientOnly && (
                    <button
                        className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
                        onClick={() => router.push("/sitemap")}
                    >
                        <span className="hidden sm:inline font-semibold text-sm text-white">Site Map</span>
                        <FaRegCompass size={24} color="white" />
                    </button>
                )}
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    aria-label="Open menu"
                >
                    <RxHamburgerMenu size={26} color="white" />
                </button>
            </div>
        </header>
    );
}
