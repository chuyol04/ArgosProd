"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/users/userContext";

export default function UserDataProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, setUser } = useUser();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track mount state to avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Only fetch if user is not already loaded
        if (user) {
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                const res = await fetch("/api/auth/getCurrentUser", {
                    credentials: "include",
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error("Failed to fetch user data");
                }

                const userData = await res.json();
                setUser(userData);
            } catch (err) {
                console.error("Error fetching user:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [user, setUser]);

    // Render nothing on server and initial client render to match
    if (!mounted) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-muted-foreground">Cargando datos de usuario...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="rounded-lg border border-red-500 bg-red-50 p-6 dark:bg-red-950">
                    <h2 className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">
                        Error al cargar usuario
                    </h2>
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
