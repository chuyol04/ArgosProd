import type { Metadata } from "next";
import HeaderLogin from "@/components/layout/HeaderLogin";
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
        <div>
            {children}
        </div>
    );
}
