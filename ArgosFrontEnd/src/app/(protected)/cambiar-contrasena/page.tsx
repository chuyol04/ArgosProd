"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { changePassword } from "@/app/(protected)/users/actions/users.actions";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        setError(null);

        if (!password || password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        startTransition(async () => {
            const result = await changePassword(password);
            if (result.success) {
                // Logout after password change
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
            } else {
                setError(result.error || "Error al cambiar contraseña");
            }
        });
    };

    return (
        <div className="mx-auto max-w-md space-y-6 px-4 py-12">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">Cambiar Contraseña</h1>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <KeyRound className="h-4 w-4" />
                        Nueva Contraseña
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            disabled={isPending}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm">Confirmar Contraseña</Label>
                        <Input
                            id="confirm"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la contraseña"
                            disabled={isPending}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="show"
                            checked={showPassword}
                            onCheckedChange={(checked) => setShowPassword(checked === true)}
                        />
                        <Label htmlFor="show" className="text-sm cursor-pointer">
                            Mostrar contraseña
                        </Label>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Al confirmar, se cerrará tu sesión y deberás iniciar sesión con la nueva contraseña.
                    </p>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={isPending || !password || !confirmPassword}
                    >
                        {isPending ? (
                            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Cambiando...</>
                        ) : (
                            "Confirmar"
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
