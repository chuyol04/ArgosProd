"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function ProtectedLayoutWrapper({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            <a
                href="#main-content"
                className="sr-only z-[60] rounded-md bg-background px-4 py-3 text-foreground shadow-md focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-2 focus-visible:outline-ring"
            >
                Saltar al contenido
            </a>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="min-h-screen lg:pl-64">
                <Header menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(true)} />
                <main id="main-content" tabIndex={-1} className="min-w-0">{children}</main>
            </div>
        </div>
    );
}
