"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { changePassword } from "@/app/(protected)/users/actions/users.actions";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ChangePasswordPage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        startTransition(async () => {
            const result = await changePassword(password);
            if (result.success) {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
                return;
            }
            setError(result.error || "No fue posible cambiar la contraseña.");
        });
    };

    return (
        <PageContainer className="max-w-lg py-6 sm:py-10">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => router.back()}
                        aria-label="Volver"
                    >
                        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Cambiar contraseña</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Actualiza la contraseña de tu cuenta.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <KeyRound className="h-4 w-4" aria-hidden="true" />
                            Nueva contraseña
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            {error ? (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                                    {error}
                                </div>
                            ) : null}

                            <div className="space-y-2">
                                <Label htmlFor="password">Contraseña nueva</Label>
                                <Input
                                    id="password"
                                    name="new-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    autoComplete="new-password"
                                    minLength={6}
                                    required
                                    disabled={isPending}
                                    aria-describedby="password-requirements"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirmar contraseña</Label>
                                <Input
                                    id="confirm"
                                    name="confirm-password"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Repite la contraseña"
                                    autoComplete="new-password"
                                    minLength={6}
                                    required
                                    disabled={isPending}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="show"
                                    checked={showPassword}
                                    onCheckedChange={(checked) => setShowPassword(checked === true)}
                                />
                                <Label htmlFor="show" className="cursor-pointer text-sm">Mostrar contraseñas</Label>
                            </div>

                            <p id="password-requirements" className="text-sm leading-6 text-muted-foreground">
                                Usa al menos 6 caracteres. Al confirmar, se cerrará tu sesión y deberás ingresar con la nueva contraseña.
                            </p>

                            <Button className="min-h-11 w-full" type="submit" disabled={isPending || !password || !confirmPassword}>
                                {isPending ? (
                                    <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />Cambiando contraseña...</>
                                ) : (
                                    "Cambiar contraseña"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
