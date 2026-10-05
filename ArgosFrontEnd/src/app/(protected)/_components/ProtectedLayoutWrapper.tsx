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
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="min-h-screen lg:pl-64">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main>{children}</main>
            </div>
        </div>
    );
}
