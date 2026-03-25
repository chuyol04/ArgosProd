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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  createService,
  updateService,
  getServiceById,
} from "@/app/(protected)/services/actions/services.actions";
import { IClient } from "@/app/(protected)/clients/types/clients.types";

type ModalMode = "create" | "edit";

interface ServiceModalProps {
  serviceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  clients: IClient[];
}

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export default function ServiceModal({
  serviceId,
  open,
  onOpenChange,
  mode,
  clients,
}: ServiceModalProps) {
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit";

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    name: "",
    start_date: "",
    end_date: "",
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setFormData({
        client_id: "",
        name: "",
        start_date: "",
        end_date: "",
      });
    }
  }, [open]);

  // Fetch service data when editing
  useEffect(() => {
    if (open && isEditMode && serviceId) {
      setIsLoading(true);
      setError(null);
      getServiceById(serviceId)
        .then((result) => {
          if (result.success && result.data) {
            setFormData({
              client_id: String(result.data.client_id),
              name: result.data.name || "",
              start_date: formatDateForInput(result.data.start_date),
              end_date: formatDateForInput(result.data.end_date),
            });
          } else {
            setError(result.error || "Error al cargar servicio");
          }
        })
        .catch(() => {
          setError("Error al cargar servicio");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, serviceId, isEditMode]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id || !formData.start_date) {
      setError("Cliente y fecha de inicio son requeridos");
      return;
    }

    setError(null);
    startTransition(async () => {
      let result;
      if (isEditMode && serviceId) {
        result = await updateService(serviceId, {
          client_id: formData.client_id ? parseInt(formData.client_id, 10) : undefined,
          name: formData.name || undefined,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
        });
      } else {
        result = await createService({
          client_id: parseInt(formData.client_id, 10),
          start_date: formData.start_date,
          end_date: formData.end_date || undefined,
          name: formData.name || undefined,
        });
      }

      if (result.success) {
        onOpenChange(false);
      } else {
        setError(result.error || `Error al ${isEditMode ? "actualizar" : "crear"} servicio`);
      }
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
            {isCreateMode ? "Crear Servicio" : "Actualizar Servicio"}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Ingresa los datos del nuevo servicio."
              : "Modifica los datos del servicio y guarda los cambios."}
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
                <Label htmlFor="client">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleChange("client_id", value)}
                  disabled={isPending}
                >
                  <SelectTrigger id="client" className="w-full">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        No hay clientes
                      </SelectItem>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Descripción</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  disabled={isPending}
                  placeholder="Descripción del servicio"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start_date">Fecha de Inicio *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange("start_date", e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Fecha de Fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange("end_date", e.target.value)}
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
                  "Crear Servicio"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
