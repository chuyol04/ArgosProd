"use client";

import { useState, useEffect, useTransition, useRef } from "react";
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
import { ImageIcon, Upload, X, Plus } from "lucide-react";

interface WorkInstructionModalProps {
  workInstructionId?: number | null; // null/undefined = create mode, number = edit mode
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultServiceId?: number; // For create mode, pre-select service
}

interface NewPhoto {
  id: string;
  file: File;
  preview: string;
  comment: string;
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

  // Photo management state
  const [existingPhotos, setExistingPhotos] = useState<IEvidence[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<number[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [editingNewPhotoId, setEditingNewPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setExistingPhotos([]);
      setPhotosToDelete([]);
      setNewPhotos([]);
      setEditingNewPhotoId(null);
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
              setExistingPhotos(wiResult.data.evidences || []);
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

  // Photo handlers
  const handleDeleteExistingPhoto = (photoId: number) => {
    setPhotosToDelete((prev) => [...prev, photoId]);
  };

  const handleRestorePhoto = (photoId: number) => {
    setPhotosToDelete((prev) => prev.filter((id) => id !== photoId));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotoEntries: NewPhoto[] = Array.from(files).map((file) => ({
      id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      file,
      preview: URL.createObjectURL(file),
      comment: "",
    }));

    setNewPhotos((prev) => [...prev, ...newPhotoEntries]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveNewPhoto = (photoId: string) => {
    setNewPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter((p) => p.id !== photoId);
    });
    if (editingNewPhotoId === photoId) {
      setEditingNewPhotoId(null);
    }
  };

  const handleUpdateNewPhotoComment = (photoId: string, comment: string) => {
    setNewPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, comment } : p))
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

        // TODO: Handle photo deletions (photosToDelete)
        // TODO: Handle photo uploads (newPhotos)
        console.log("Photos to delete:", photosToDelete);
        console.log("New photos to upload:", newPhotos.map(p => ({ comment: p.comment, fileName: p.file.name })));
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

        // TODO: For create mode, we'd need the new ID to add collaborators and photos
        // For now, collaborators and photos can only be added in edit mode
        if (selectedCollaborators.length > 0 && result.id) {
          await updateWorkInstructionCollaborators(result.id, selectedCollaborators);
        }

        console.log("New photos to upload:", newPhotos.map(p => ({ comment: p.comment, fileName: p.file.name })));
      }

      onOpenChange(false);
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isPending) return;
    onOpenChange(newOpen);
  };

  const visibleExistingPhotos = existingPhotos.filter(
    (p) => !photosToDelete.includes(p.id)
  );
  const deletedPhotos = existingPhotos.filter((p) =>
    photosToDelete.includes(p.id)
  );

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

                {/* Photos Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Fotos ({visibleExistingPhotos.length + newPhotos.length})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Photo Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Existing Photos (only in edit mode) */}
                    {visibleExistingPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group border rounded-lg overflow-hidden bg-muted/30"
                      >
                        <div className="aspect-video flex items-center justify-center">
                          {photo.photo_url ? (
                            <img
                              src={photo.photo_url}
                              alt={photo.comment || "Foto"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExistingPhoto(photo.id)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {photo.comment && (
                          <div className="p-2 border-t bg-background/80">
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {photo.comment}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* New Photos (pending upload) */}
                    {newPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative group border-2 border-dashed border-primary/50 rounded-lg overflow-hidden bg-primary/5"
                      >
                        <div className="aspect-video flex items-center justify-center">
                          <img
                            src={photo.preview}
                            alt="Nueva foto"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                          Nueva
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewPhoto(photo.id)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Quitar foto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="p-2 border-t bg-background/90">
                          {editingNewPhotoId === photo.id ? (
                            <div className="space-y-1">
                              <Input
                                value={photo.comment}
                                onChange={(e) =>
                                  handleUpdateNewPhotoComment(photo.id, e.target.value)
                                }
                                placeholder="Descripción de la foto..."
                                className="h-7 text-xs"
                                autoFocus
                                onBlur={() => setEditingNewPhotoId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setEditingNewPhotoId(null);
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingNewPhotoId(photo.id)}
                              className="w-full text-left"
                            >
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {photo.comment || (
                                  <span className="italic">Click para agregar descripción...</span>
                                )}
                              </p>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Empty State / Upload Dropzone */}
                    {visibleExistingPhotos.length === 0 && newPhotos.length === 0 && (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="col-span-2 border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground text-center">
                          Arrastra imágenes aquí o haz click para seleccionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG hasta 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Deleted Photos (can restore) - only in edit mode */}
                  {deletedPhotos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Fotos marcadas para eliminar ({deletedPhotos.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {deletedPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative w-16 h-16 rounded border opacity-50 overflow-hidden group"
                          >
                            {photo.photo_url ? (
                              <img
                                src={photo.photo_url}
                                alt="Foto eliminada"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRestorePhoto(photo.id)}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Restaurar foto"
                            >
                              <span className="text-xs text-white">Restaurar</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
