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
import { Loader2 } from "lucide-react";
import {
  createClient,
  updateClient,
  getClientById,
} from "@/app/(protected)/clients/actions/clients.actions";

type ModalMode = "create" | "edit";

interface ClientModalProps {
  clientId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
}

export default function ClientModal({
  clientId,
  open,
  onOpenChange,
  mode,
}: ClientModalProps) {
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact_person: "",
    phone_number: "",
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setFormData({
        name: "",
        email: "",
        contact_person: "",
        phone_number: "",
      });
    }
  }, [open]);

  // Fetch client data when editing
  useEffect(() => {
    if (open && isEditMode && clientId) {
      setIsLoading(true);
      setError(null);
      getClientById(clientId)
        .then((result) => {
          if (result.success && result.data) {
            setFormData({
              name: result.data.name || "",
              email: result.data.email || "",
              contact_person: result.data.contact_person || "",
              phone_number: result.data.phone_number || "",
            });
          } else {
            setError(result.error || "Error al cargar cliente");
          }
        })
        .catch(() => {
          setError("Error al cargar cliente");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, clientId, isEditMode]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        let result;
        if (isEditMode && clientId) {
          result = await updateClient(clientId, formData);
        } else {
          result = await createClient({
            name: formData.name,
            email: formData.email,
            contact_person: formData.contact_person || undefined,
            phone_number: formData.phone_number || undefined,
          });
        }

        if (result.success) {
          onOpenChange(false);
        } else {
          setError(result.error || `Error al ${isEditMode ? "actualizar" : "crear"} cliente`);
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
          <DialogTitle>
            {isCreateMode ? "Crear Cliente" : "Actualizar Cliente"}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Ingresa los datos del nuevo cliente."
              : "Modifica los datos del cliente y guarda los cambios."}
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
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact_person">Persona de Contacto</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => handleChange("contact_person", e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone_number">Teléfono</Label>
                <Input
                  id="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => handleChange("phone_number", e.target.value)}
                  disabled={isPending}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
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
                  "Crear Cliente"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
