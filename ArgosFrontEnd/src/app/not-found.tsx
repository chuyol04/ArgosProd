import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold text-muted-foreground">Error 404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Página no encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          La dirección no existe o el contenido ya no está disponible.
        </p>
        <Button asChild className="mt-6 min-h-11">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
