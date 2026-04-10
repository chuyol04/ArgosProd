"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    getUserById,
    updateUser,
    fetchRoles,
} from "@/app/(protected)/users/actions/users.actions";
import { IUserDetails, IRole } from "@/app/(protected)/users/types/users.types";
import { Loader2, Save } from "lucide-react";

interface UserEditModalProps {
    userId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UserEditModal({
    userId,
    open,
    onOpenChange,
}: UserEditModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roles, setRoles] = useState<IRole[]>([]);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    useEffect(() => {
        if (open && userId) {
            setIsLoading(true);
            setError(null);

            Promise.all([getUserById(userId), fetchRoles()])
                .then(([userResult, rolesData]) => {
                    setRoles(rolesData);

                    if (userResult.success && userResult.data) {
                        const d = userResult.data;
                        setName(d.name || "");
                        setEmail(d.email || "");
                        setPhoneNumber(d.phone_number || "");
                        setIsActive(d.is_active);
                        setSelectedRoleId(
                            d.roles.length > 0 ? String(d.roles[0].id) : ""
                        );
                    } else {
                        setError(userResult.error || "Error al cargar usuario");
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [open, userId]);

    const handleSave = () => {
        if (!userId || !name.trim() || !email.trim()) {
            setError("Nombre y correo son obligatorios");
            return;
        }

        setError(null);
        startTransition(async () => {
            const result = await updateUser(userId, {
                name: name.trim(),
                email: email.trim(),
                phone_number: phoneNumber.trim(),
                is_active: isActive,
                role_id: selectedRoleId ? Number(selectedRoleId) : null,
            });

            if (result.success) {
                onOpenChange(false);
                router.refresh();
            } else {
                setError(result.error || "Error al actualizar");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4 py-2">
                        {error && (
                            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nombre completo"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Correo *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="000-000-0000"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select
                                value={selectedRoleId}
                                onValueChange={setSelectedRoleId}
                                disabled={isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem key={role.id} value={String(role.id)}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <Label htmlFor="active" className="cursor-pointer">
                                Usuario activo
                            </Label>
                            <Switch
                                id="active"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                disabled={isPending}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isPending || isLoading}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-1.5 h-4 w-4" />
                                Guardar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
