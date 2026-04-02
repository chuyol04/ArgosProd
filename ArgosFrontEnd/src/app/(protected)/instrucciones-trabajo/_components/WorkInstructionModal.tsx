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
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWorkInstruction,
  updateWorkInstruction,
  getWorkInstructionDetails,
  fetchServicesForSelect,
  fetchPartsForSelect,
  fetchUsersForSelect,
  updateWorkInstructionCollaborators,
  IServiceOption,
  IPartOption,
  IUserOption,
} from "@/app/(protected)/instrucciones-trabajo/actions/instrucciones-trabajo.actions";
import { IEvidence } from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";
import { WorkInstructionFiles } from "./WorkInstructionFiles";

interface WorkInstructionModalProps {
  workInstructionId?: number | null; // null/undefined = create mode, number = edit mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultServiceId?: number; // For create mode, pre-select service
}

export default function WorkInstructionModal({
  workInstructionId,
  open,
  onOpenChange,
  defaultServiceId,
}: WorkInstructionModalProps) {
  const isEditMode = !!workInstructionId;

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<IServiceOption[]>([]);
  const [parts, setParts] = useState<IPartOption[]>([]);
  const [users, setUsers] = useState<IUserOption[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    service_id: "",
    part_id: "",
    inspection_rate_per_hour: "",
    description: "",
  });

  // Files/evidence state
  const [existingFiles, setExistingFiles] = useState<IEvidence[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setFormData({
        service_id: defaultServiceId ? String(defaultServiceId) : "",
        part_id: "",
        inspection_rate_per_hour: "",
        description: "",
      });
      setSelectedCollaborators([]);
      setExistingFiles([]);
    }
  }, [open, defaultServiceId]);

  // Fetch data when modal opens
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);

      if (isEditMode && workInstructionId) {
        // Edit mode: fetch work instruction details + options
        Promise.all([
          getWorkInstructionDetails(workInstructionId),
          fetchServicesForSelect(),
          fetchPartsForSelect(),
          fetchUsersForSelect(),
        ])
          .then(([wiResult, servicesData, partsData, usersData]) => {
            setServices(servicesData);
            setParts(partsData);
            setUsers(usersData);
            if (wiResult.success && wiResult.data) {
              const instruction = wiResult.data.instruction;
              setFormData({
                service_id: String(instruction.service_id),
                part_id: String(instruction.part_id),
                inspection_rate_per_hour: String(instruction.inspection_rate_per_hour),
                description: instruction.description || "",
              });
              const collaboratorIds = wiResult.data.collaborators.map(c => c.id);
              setSelectedCollaborators(collaboratorIds);
              setExistingFiles(wiResult.data.evidences || []);
            } else {
              setError(wiResult.error || "Error al cargar instrucción de trabajo");
            }
          })
          .catch(() => {
            setError("Error al cargar datos");
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        // Create mode: fetch only options
        Promise.all([
          fetchServicesForSelect(),
          fetchPartsForSelect(),
          fetchUsersForSelect(),
        ])
          .then(([servicesData, partsData, usersData]) => {
            setServices(servicesData);
            setParts(partsData);
            setUsers(usersData);
            if (defaultServiceId) {
              setFormData((prev) => ({ ...prev, service_id: String(defaultServiceId) }));
            }
          })
          .catch(() => {
            setError("Error al cargar datos");
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [open, workInstructionId, isEditMode, defaultServiceId]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCollaboratorToggle = (userId: number) => {
    setSelectedCollaborators((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.service_id || !formData.part_id || !formData.inspection_rate_per_hour) {
      setError("Por favor complete todos los campos requeridos");
      return;
    }

    startTransition(async () => {
      if (isEditMode && workInstructionId) {
        // Update existing work instruction
        const result = await updateWorkInstruction(workInstructionId, {
          service_id: Number(formData.service_id),
          part_id: Number(formData.part_id),
          inspection_rate_per_hour: Number(formData.inspection_rate_per_hour),
          description: formData.description || undefined,
        });

        if (!result.success) {
          setError(result.error || "Error al actualizar instrucción de trabajo");
          return;
        }

        // Update collaborators
        const collabResult = await updateWorkInstructionCollaborators(
          workInstructionId,
          selectedCollaborators
        );

        if (!collabResult.success) {
          setError(collabResult.error || "Error al actualizar colaboradores");
          return;
        }
        // Files are uploaded in real-time via WorkInstructionFiles component
      } else {
        // Create new work instruction
        const result = await createWorkInstruction({
          service_id: Number(formData.service_id),
          part_id: Number(formData.part_id),
          inspection_rate_per_hour: Number(formData.inspection_rate_per_hour),
          description: formData.description || undefined,
        });

        if (!result.success) {
          setError(result.error || "Error al crear instrucción de trabajo");
          return;
        }

        // Add collaborators if any selected
        if (selectedCollaborators.length > 0 && result.id) {
          await updateWorkInstructionCollaborators(result.id, selectedCollaborators);
        }
        // Files can be added after creating, in edit mode
      }

      onOpenChange(false);
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isPending) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[74vw] max-w-[74vw] max-h-[85vh] overflow-hidden p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Actualizar Instrucción de Trabajo" : "Nueva Instrucción de Trabajo"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Modifica los datos de la instrucción de trabajo y guarda los cambios."
                : "Crea una nueva instrucción de trabajo asociada a un servicio y pieza."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 p-6 pt-4 h-[calc(85vh-180px)]">
              {/* Left Column - Description (Rich Text Editor) */}
              <div className="flex flex-col h-full">
                <Label htmlFor="description" className="text-sm font-medium text-muted-foreground mb-2">
                  Descripción
                </Label>
                <div className="flex-1 min-h-0">
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => handleChange("description", value)}
                    disabled={isPending}
                    placeholder="Escribe la descripción de la instrucción de trabajo..."
                    className="h-full"
                  />
                </div>
              </div>

              {/* Right Column - Other Fields + Photos (scrollable) */}
              <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-2">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="service_id">Servicio *</Label>
                    <Select
                      value={formData.service_id}
                      onValueChange={(value) => handleChange("service_id", value)}
                      disabled={isPending || (!isEditMode && !!defaultServiceId)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={String(service.id)}>
                            {service.name || `Servicio #${service.id}`} - {service.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="part_id">Pieza *</Label>
                    <Select
                      value={formData.part_id}
                      onValueChange={(value) => handleChange("part_id", value)}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una pieza" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts.map((part) => (
                          <SelectItem key={part.id} value={String(part.id)}>
                            {part.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="inspection_rate_per_hour">Piezas por Hora *</Label>
                    <Input
                      id="inspection_rate_per_hour"
                      type="number"
                      min="1"
                      value={formData.inspection_rate_per_hour}
                      onChange={(e) => handleChange("inspection_rate_per_hour", e.target.value)}
                      disabled={isPending}
                      required
                    />
                  </div>
                </div>

                <Separator />

                {/* Collaborators Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Colaboradores ({selectedCollaborators.length} seleccionados)
                  </Label>
                  <div className="border rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2">
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay usuarios disponibles</p>
                    ) : (
                      users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50"
                        >
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedCollaborators.includes(user.id)}
                            onCheckedChange={() => handleCollaboratorToggle(user.id)}
                            disabled={isPending}
                          />
                          <label
                            htmlFor={`user-${user.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <span className="font-medium">{user.name}</span>
                            <span className="text-muted-foreground ml-2">({user.email})</span>
                            {user.role && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {user.role}
                              </span>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Files Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Archivos ({existingFiles.length})
                  </Label>
                  <WorkInstructionFiles
                    workInstructionId={workInstructionId ?? null}
                    existingFiles={existingFiles}
                    onFilesChange={setExistingFiles}
                    disabled={isPending}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <p className="text-xs text-muted-foreground">
                  Los campos marcados con * son obligatorios.
                </p>
              </div>
            </div>

            <DialogFooter className="p-6 pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? (isEditMode ? "Guardando..." : "Creando...")
                  : (isEditMode ? "Guardar Cambios" : "Crear")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
