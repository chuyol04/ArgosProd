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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import {
  createService,
  getClientUsersForService,
  updateService,
  getServiceById,
} from "@/app/(protected)/services/actions/services.actions";
import { IClientPortalUser } from "@/app/(protected)/services/types/services.types";
import { IClient } from "@/app/(protected)/clients/types/clients.types";
import { toDateInputValue, emptyToUndefined } from "@/lib/dateTimeUtils";

type ModalMode = "create" | "edit";

interface ServiceModalProps {
  serviceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ModalMode;
  clients: IClient[];
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
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientUsers, setClientUsers] = useState<IClientPortalUser[]>([]);
  const [selectedClientUserIds, setSelectedClientUserIds] = useState<number[]>([]);
  const defaultClientId = clients.length === 1 ? String(clients[0].id) : "";
  const [formData, setFormData] = useState({
    client_id: defaultClientId,
    name: "",
    start_date: "",
    end_date: "",
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setFormData({
        client_id: defaultClientId,
        name: "",
        start_date: "",
        end_date: "",
      });
      setClientUsers([]);
      setSelectedClientUserIds([]);
    }
  }, [open, defaultClientId]);

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
              start_date: toDateInputValue(result.data.start_date),
              end_date: toDateInputValue(result.data.end_date),
            });
            setSelectedClientUserIds(result.data.client_user_ids ?? []);
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

  const selectedClientId = Number(formData.client_id);
  useEffect(() => {
    if (!open || !Number.isSafeInteger(selectedClientId) || selectedClientId <= 0) {
      setClientUsers([]);
      setIsUsersLoading(false);
      return;
    }

    let cancelled = false;
    setIsUsersLoading(true);
    getClientUsersForService(selectedClientId)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setClientUsers(result.data ?? []);
        } else {
          setClientUsers([]);
          setError(result.error || "Error al cargar usuarios del cliente");
        }
      })
      .finally(() => {
        if (!cancelled) setIsUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, selectedClientId]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClientChange = (value: string) => {
    setError(null);
    setSelectedClientUserIds([]);
    handleChange("client_id", value);
  };

  const toggleClientUser = (userId: number, checked: boolean) => {
    setSelectedClientUserIds((current) =>
      checked
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId)
    );
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
          start_date: emptyToUndefined(formData.start_date),
          end_date: emptyToUndefined(formData.end_date),
          client_user_ids: selectedClientUserIds,
        });
      } else {
        result = await createService({
          client_id: parseInt(formData.client_id, 10),
          start_date: formData.start_date,
          end_date: emptyToUndefined(formData.end_date),
          name: formData.name || undefined,
          client_user_ids: selectedClientUserIds,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
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
                  onValueChange={handleClientChange}
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
                          {client.name} — {client.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Usuarios cliente con acceso</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedClientUserIds.length} seleccionado(s)
                  </span>
                </div>
                <div className="rounded-md border">
                  {isUsersLoading ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando usuarios...
                    </div>
                  ) : !formData.client_id ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      Selecciona un cliente para ver sus usuarios.
                    </p>
                  ) : clientUsers.length === 0 ? (
                    <div className="flex gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Users className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Este cliente aún no tiene usuarios activos con rol Cliente. Créelos en Usuarios y vuelve a este servicio.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-44 divide-y overflow-y-auto">
                      {clientUsers.map((user) => {
                        const checked = selectedClientUserIds.includes(user.id);
                        return (
                          <label
                            key={user.id}
                            className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleClientUser(user.id, value === true)}
                              disabled={isPending}
                              aria-label={`Dar acceso a ${user.name}`}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{user.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo los usuarios seleccionados podrán consultar los reportes, detalles y Excel de este servicio.
                </p>
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
              <Button type="submit" disabled={isPending || isUsersLoading}>
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
