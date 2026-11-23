"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";

export default function ProtectedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageContainer>
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-card px-5 py-12 text-center">
        <div className="max-w-md">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold">No pudimos mostrar esta página</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ocurrió un problema inesperado. Intenta cargar nuevamente o vuelve al inicio.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button type="button" className="min-h-11" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Intentar nuevamente
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
