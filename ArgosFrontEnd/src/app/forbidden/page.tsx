import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-destructive">Error 403</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">No tienes acceso a esta sección</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Tu cuenta está activa, pero su rol no permite consultar esta página. Vuelve al inicio para continuar.
        </p>
        <Button asChild className="mt-6 min-h-11">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </main>
  );
}
