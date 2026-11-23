"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import HeaderLogin from "@/components/layout/HeaderLogin";
import { loginAction } from "@/app/(auth)/login/data/login.action";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await loginAction(email, password);

    // Only reaches here on error (success redirects server-side)
    setError(result.error);
    setLoading(false);
  };

  return (
    <>
      <HeaderLogin />

      {/* Hero Banner */}
      <div
        className="h-48 w-full bg-cover bg-[position:center_30%]"
        style={{ backgroundImage: "url('/bannernuevo1.webp')" }}
      ></div>

      {/* Login Form */}
      <main id="main-content" className="mx-auto mt-8 w-full max-w-sm px-4 pb-8 sm:mt-12">
        <h1 className="sr-only">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="flex w-full flex-col space-y-6" aria-busy={loading}>
          {error && (
            <div id="login-error" role="alert" className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              spellCheck={false}
              aria-describedby={error ? "login-error" : undefined}
              placeholder="ejemplo@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              autoComplete="current-password"
              aria-describedby={error ? "login-error" : undefined}
              type={showPassword ? "text" : "password"}
              placeholder="contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="showPassword"
                checked={showPassword}
                onCheckedChange={(checked) => setShowPassword(checked === true)}
              />
              <Label htmlFor="showPassword" className="font-normal text-sm cursor-pointer">
                Ver contraseña
              </Label>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              "Ingresar"
            )}
          </Button>
        </form>
      </main>
    </>
  );
}
