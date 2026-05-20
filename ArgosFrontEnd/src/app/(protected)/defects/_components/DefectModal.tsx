"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  createDefect,
  updateDefect,
  getDefectById,
} from "@/app/(protected)/defects/actions/defects.actions";

type ModalMode = "create" | "edit";

interface DefectModalProps {
  defectId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
}

export default function DefectModal({ defectId, open, onOpenChange, mode }: DefectModalProps) {
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    if (!open) {
      setError(null);
      setFormData({ name: "", description: "" });
    }
  }, [open]);

  useEffect(() => {
    if (open && isEditMode && defectId) {
      setIsLoading(true);
      setError(null);
      getDefectById(defectId)
        .then((result) => {
          if (result.success && result.data) {
            setFormData({
              name: result.data.name || "",
              description: result.data.description || "",
            });
          } else {
            setError(result.error || "Error al cargar defecto");
          }
        })
        .catch(() => setError("Error al cargar defecto"))
        .finally(() => setIsLoading(false));
    }
  }, [open, defectId, isEditMode]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        let result;
        if (isEditMode && defectId) {
          result = await updateDefect(defectId, { name: formData.name, description: formData.description });
        } else {
          result = await createDefect({
            name: formData.name,
            description: formData.description || undefined,
          });
        }

        if (result.success) {
          onOpenChange(false);
        } else {
          setError(result.error || `Error al ${isEditMode ? "actualizar" : "crear"} defecto`);
        }
      })();
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isPending) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isCreateMode ? "Crear Defecto" : "Actualizar Defecto"}</DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Ingresa los datos del nuevo defecto."
              : "Modifica los datos del defecto y guarda los cambios."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={isPending}
                  rows={3}
                  placeholder="Descripción opcional..."
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Guardando..." : "Creando..."}
                  </>
                ) : isEditMode ? (
                  "Guardar Cambios"
                ) : (
                  "Crear Defecto"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
