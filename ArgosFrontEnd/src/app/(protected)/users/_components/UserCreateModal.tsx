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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { createUser, fetchRoles } from "@/app/(protected)/users/actions/users.actions";
import { IRole } from "@/app/(protected)/users/types/users.types";
import { Loader2, Plus, Copy, Check, AlertTriangle } from "lucide-react";

interface UserCreateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UserCreateModal({ open, onOpenChange }: UserCreateModalProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [roles, setRoles] = useState<IRole[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState<string>("");

    // Result
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open) {
            setName("");
            setEmail("");
            setPhoneNumber("");
            setSelectedRoleId("");
            setError(null);
            setTempPassword(null);
            setCopied(false);
            fetchRoles().then(setRoles);
        }
    }, [open]);

    const handleCreate = () => {
        if (!name.trim() || !email.trim()) {
            setError("Nombre y correo son obligatorios");
            return;
        }
        setError(null);
        startTransition(async () => {
            const result = await createUser({
                name: name.trim(),
                email: email.trim(),
                phone_number: phoneNumber.trim(),
                role_id: selectedRoleId ? Number(selectedRoleId) : null,
            });
            if (result.success && result.temp_password) {
                setTempPassword(result.temp_password);
                router.refresh();
            } else {
                setError(result.error || "Error al crear usuario");
            }
        });
    };

    const handleCopy = () => {
        if (tempPassword) {
            navigator.clipboard.writeText(tempPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Show password result screen
    if (tempPassword) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Usuario Creado</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            El usuario <span className="font-medium text-foreground">{email}</span> ha sido creado exitosamente.
                        </p>

                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Contraseña Temporal
                            </Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono font-bold tracking-wider border">
                                    {tempPassword}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9"
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-amber-800 dark:text-amber-200">
                                Esta contraseña solo se mostrará una vez. Asegúrate de copiarla y compartirla con el usuario.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>Crear Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Nombre *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre completo"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Correo *</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="000-000-0000"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Rol</Label>
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={isPending}>
                        {isPending ? (
                            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Creando...</>
                        ) : (
                            <><Plus className="mr-1.5 h-4 w-4" />Crear</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
