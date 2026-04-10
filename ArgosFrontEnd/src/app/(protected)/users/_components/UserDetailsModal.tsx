"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getUserById } from "@/app/(protected)/users/actions/users.actions";
import { IUserDetails } from "@/app/(protected)/users/types/users.types";
import { Loader2 } from "lucide-react";

interface UserDetailsModalProps {
    userId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UserDetailsModal({
    userId,
    open,
    onOpenChange,
}: UserDetailsModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [details, setDetails] = useState<IUserDetails | null>(null);

    useEffect(() => {
        if (open && userId) {
            setIsLoading(true);
            setError(null);
            getUserById(userId)
                .then((result) => {
                    if (result.success && result.data) {
                        setDetails(result.data);
                    } else {
                        setError(result.error || "Error al cargar detalles");
                    }
                })
                .finally(() => setIsLoading(false));
        } else {
            setDetails(null);
        }
    }, [open, userId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalles del Usuario</DialogTitle>
                </DialogHeader>

                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {details && (
                    <div className="space-y-6">
                        {/* User Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Nombre
                                </p>
                                <p className="text-sm font-medium">{details.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Correo
                                </p>
                                <p className="text-sm font-medium">{details.email}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Teléfono
                                </p>
                                <p className="text-sm font-medium">
                                    {details.phone_number || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Estado
                                </p>
                                <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        details.is_active
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                                >
                                    {details.is_active ? "Activo" : "Inactivo"}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Rol
                                </p>
                                {details.roles.length > 0 ? (
                                    <div className="flex gap-1 mt-1">
                                        {details.roles.map((role) => (
                                            <span
                                                key={role.id}
                                                className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                            >
                                                {role.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Sin rol asignado</p>
                                )}
                            </div>
                        </div>

                        {/* Work Instructions */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                Instrucciones de Trabajo ({details.work_instructions.length})
                            </h3>
                            {details.work_instructions.length > 0 ? (
                                <div className="rounded-lg border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">
                                                    Pieza
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">
                                                    Servicio
                                                </th>
                                                <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">
                                                    Cliente
                                                </th>
                                                <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs">
                                                    Tasa/hr
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {details.work_instructions.map((wi) => (
                                                <tr key={wi.id} className="hover:bg-muted/30">
                                                    <td className="px-3 py-2">{wi.part_name}</td>
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {wi.service_name}
                                                    </td>
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {wi.client_name}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        {wi.inspection_rate_per_hour}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                                    No tiene instrucciones de trabajo asignadas
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
