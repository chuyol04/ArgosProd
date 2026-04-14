"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { resetUserPassword } from "@/app/(protected)/users/actions/users.actions";
import { Loader2, Copy, Check, AlertTriangle, KeyRound } from "lucide-react";
import { Label } from "@/components/ui/label";

interface PasswordResetDialogProps {
    userId: number | null;
    userName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function PasswordResetDialog({
    userId,
    userName,
    open,
    onOpenChange,
}: PasswordResetDialogProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleReset = () => {
        if (!userId) return;
        setError(null);
        startTransition(async () => {
            const result = await resetUserPassword(userId);
            if (result.success && result.new_password) {
                setNewPassword(result.new_password);
            } else {
                setError(result.error || "Error al cambiar contraseña");
            }
        });
    };

    const handleCopy = () => {
        if (newPassword) {
            navigator.clipboard.writeText(newPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setNewPassword(null);
        setError(null);
        setCopied(false);
        onOpenChange(false);
    };

    // Show result
    if (newPassword) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Contraseña Restablecida</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            La contraseña de <span className="font-medium text-foreground">{userName}</span> ha sido restablecida.
                        </p>
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Nueva Contraseña
                            </Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono font-bold tracking-wider border">
                                    {newPassword}
                                </code>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleCopy}>
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-amber-800 dark:text-amber-200">
                                Esta contraseña solo se mostrará una vez. Asegúrate de compartirla con el usuario.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleClose}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Confirmation
    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Restablecer Contraseña</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Se generará una nueva contraseña aleatoria para <span className="font-medium text-foreground">{userName}</span>.
                        La contraseña actual dejará de funcionar.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleReset} disabled={isPending}>
                        {isPending ? (
                            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Generando...</>
                        ) : (
                            <><KeyRound className="mr-1.5 h-4 w-4" />Restablecer</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
