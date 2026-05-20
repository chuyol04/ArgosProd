"use client";

import { RxHamburgerMenu } from "react-icons/rx";
import { FaRegCompass } from "react-icons/fa6";
import { Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const router = useRouter();

    return (
        <header className="flex flex-row w-full px-4 h-[70px] bg-gray-900 sticky top-0 z-30 items-center">
            <div className="w-1/3 flex flex-row items-center">
                <button onClick={() => router.push("/home")} className="hover:opacity-80 transition-opacity">
                    <Image
                        src="/logo.png"
                        alt="OzCab Group"
                        width={120}
                        height={40}
                        className="h-10 w-auto object-contain"
                        priority
                    />
                </button>
            </div>
            <div className="w-2/3 flex flex-row justify-end pr-2 items-center gap-2 lg:gap-4">
                <button
                    className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
                    onClick={() => router.push("/home")}
                    aria-label="Home"
                >
                    <span className="hidden sm:inline font-semibold text-sm text-white">Página principal</span>
                    <Home size={22} color="white" />
                </button>
                <button
                    className="flex flex-row items-center gap-2 hover:opacity-80 transition-opacity"
                    onClick={() => router.push("/sitemap")}
                >
                    <span className="hidden sm:inline font-semibold text-sm text-white">Site Map</span>
                    <FaRegCompass size={24} color="white" />
                </button>
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
