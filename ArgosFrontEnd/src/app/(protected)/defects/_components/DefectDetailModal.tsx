"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { getDefectById } from "@/app/(protected)/defects/actions/defects.actions";
import { IDefect } from "@/app/(protected)/defects/types/defects.types";

interface DefectDetailModalProps {
  defectId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DefectDetailModal({ defectId, open, onOpenChange }: DefectDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defect, setDefect] = useState<IDefect | null>(null);

  useEffect(() => {
    if (!open || !defectId) return;
    setIsLoading(true);
    setError(null);
    setDefect(null);
    getDefectById(defectId)
      .then((result) => {
        if (result.success && result.data) {
          setDefect(result.data);
        } else {
          setError(result.error || "Error al cargar defecto");
        }
      })
      .catch(() => setError("Error al cargar defecto"))
      .finally(() => setIsLoading(false));
  }, [open, defectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detalle de Defecto</DialogTitle>
          <DialogDescription>Información completa del defecto seleccionado.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : defect ? (
          <div className="grid gap-4 py-2">
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</span>
              <span className="text-sm">{defect.id}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nombre</span>
              <span className="text-sm font-medium">{defect.name}</span>
            </div>
            <div className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descripción</span>
              <span className="text-sm">
                {defect.description || <span className="text-muted-foreground italic">Sin descripción</span>}
              </span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
