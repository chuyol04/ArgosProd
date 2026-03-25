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
        className="h-50 w-full bg-cover bg-center flex justify-center items-center"
        style={{ backgroundImage: "url('/herobanner.png')" }}
      >
        <span className="text-3xl text-white">Login</span>
      </div>

      {/* Login Form */}
      <div className="flex w-full mt-12 justify-center items-center">
        <form onSubmit={handleSubmit} className="space-y-6 flex flex-col w-80">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
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
      </div>
    </>
  );
}
