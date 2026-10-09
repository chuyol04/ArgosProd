import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/contexts/users/userContext";

export const metadata: Metadata = {
    title: "ozcabSorting",
    description: "Sistema de inspección de OZCAB",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <UserProvider>
                    {children}
                </UserProvider>
            </body>
        </html>
    );
}
