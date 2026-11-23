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
  updateWorkInstructionDefects,
  addWorkInstructionEvidence,
  IServiceOption,
  IPartOption,
  IUserOption,
} from "@/app/(protected)/instrucciones-trabajo/actions/instrucciones-trabajo.actions";
import { IEvidence } from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";
import {
  fetchDefects,
  IDefect,
} from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";
import { WorkInstructionFiles } from "./WorkInstructionFiles";
import { uploadFile } from "@/lib/storage/fileUpload";
import { createDefect } from "@/app/(protected)/defects/actions/defects.actions";

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
  const [defects, setDefects] = useState<IDefect[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<number[]>([]);
  const [selectedDefects, setSelectedDefects] = useState<number[]>([]);
  const [newDefectName, setNewDefectName] = useState("");
  const [isAddingDefect, setIsAddingDefect] = useState(false);
  const [formData, setFormData] = useState({
    service_id: "",
    part_name: "",
    inspection_rate_per_hour: "",
    inspection_mode: "rate" as "rate" | "full_time",
    start_date: "",
    description: "",
    problem: "",
  });

  // Files/evidence state
  const [existingFiles, setExistingFiles] = useState<IEvidence[]>([]);
  // Create mode only: files attached before the work instruction exists yet.
  const [queuedMainFile, setQueuedMainFile] = useState<File | null>(null);
  const [queuedComplementaryFiles, setQueuedComplementaryFiles] = useState<File[]>([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setFormData({
        service_id: defaultServiceId ? String(defaultServiceId) : "",
        part_name: "",
        inspection_rate_per_hour: "",
        inspection_mode: "rate",
        start_date: "",
        description: "",
        problem: "",
      });
      setSelectedCollaborators([]);
      setSelectedDefects([]);
      setNewDefectName("");
      setExistingFiles([]);
      setQueuedMainFile(null);
      setQueuedComplementaryFiles([]);
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
          fetchDefects(),
        ])
          .then(([wiResult, servicesData, partsData, usersData, defectsData]) => {
            setServices(servicesData);
            setParts(partsData);
            setUsers(usersData);
            setDefects(defectsData);
            if (wiResult.success && wiResult.data) {
              const instruction = wiResult.data.instruction;
              setFormData({
                service_id: String(instruction.service_id),
                part_name: instruction.part_name || "",
                inspection_rate_per_hour: String(instruction.inspection_rate_per_hour ?? ""),
                inspection_mode: instruction.inspection_mode || "rate",
                start_date: instruction.start_date?.slice(0, 10) || "",
                description: instruction.description || "",
                problem: instruction.problem || "",
              });
              const collaboratorIds = wiResult.data.collaborators.map(c => c.id);
              setSelectedCollaborators(collaboratorIds);
              setSelectedDefects(wiResult.data.defects.map((defect) => defect.id));
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
          fetchDefects(),
        ])
          .then(([servicesData, partsData, usersData, defectsData]) => {
            setServices(servicesData);
            setParts(partsData);
            setUsers(usersData);
            setDefects(defectsData);
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

  const handleDefectToggle = (defectId: number) => {
    setSelectedDefects((prev) =>
      prev.includes(defectId)
        ? prev.filter((id) => id !== defectId)
        : [...prev, defectId]
    );
  };

  const handleAddDefect = async () => {
    const name = newDefectName.trim();
    if (!name) return;
    const existing = defects.find((defect) => defect.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSelectedDefects((prev) => prev.includes(existing.id) ? prev : [...prev, existing.id]);
      setNewDefectName("");
      return;
    }
    setIsAddingDefect(true);
    const result = await createDefect({ name });
    setIsAddingDefect(false);
    if (!result.success || !result.id) {
      setError(result.error || "No se pudo agregar el defecto al catálogo");
      return;
    }
    const created: IDefect = { id: result.id, name, description: null };
    setDefects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedDefects((prev) => [...prev, created.id]);
    setNewDefectName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.service_id || !formData.part_name.trim() || !formData.start_date ||
        (formData.inspection_mode === "rate" && !formData.inspection_rate_per_hour)) {
      setError("Por favor complete todos los campos requeridos");
      return;
    }

    startTransition(async () => {
      if (isEditMode && workInstructionId) {
        // Update existing work instruction
        const result = await updateWorkInstruction(workInstructionId, {
          service_id: Number(formData.service_id),
          part_name: formData.part_name.trim(),
          inspection_rate_per_hour: formData.inspection_mode === "rate"
            ? Number(formData.inspection_rate_per_hour)
            : null,
          inspection_mode: formData.inspection_mode,
          start_date: formData.start_date,
          description: formData.description || undefined,
          problem: formData.problem,
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

        const defectResult = await updateWorkInstructionDefects(
          workInstructionId,
          selectedDefects
        );
        if (!defectResult.success) {
          setError(defectResult.error || "Error al actualizar defectos");
          return;
        }
        // Files are uploaded in real-time via WorkInstructionFiles component
      } else {
        // Create new work instruction
        const result = await createWorkInstruction({
          service_id: Number(formData.service_id),
          part_name: formData.part_name.trim(),
          ...(formData.inspection_mode === "rate"
            ? { inspection_rate_per_hour: Number(formData.inspection_rate_per_hour) }
            : {}),
          inspection_mode: formData.inspection_mode,
          start_date: formData.start_date,
          description: formData.description || undefined,
          problem: formData.problem || undefined,
        });

        if (!result.success) {
          setError(result.error || "Error al crear instrucción de trabajo");
          return;
        }

        // Add collaborators if any selected
        if (selectedCollaborators.length > 0 && result.id) {
          await updateWorkInstructionCollaborators(result.id, selectedCollaborators);
        }

        if (selectedDefects.length > 0 && result.id) {
          const defectResult = await updateWorkInstructionDefects(result.id, selectedDefects);
          if (!defectResult.success) {
            setError(defectResult.error || "La IT se creó, pero no se pudieron asociar los defectos");
            return;
          }
        }

        // Upload + link any files attached during creation. The IT already
        // exists at this point, so a failed upload never leaves an orphaned
        // file or an incomplete record - it's just reported to the user.
        // Main IT goes first (and is flagged is_main_it), then complements.
        if ((queuedMainFile || queuedComplementaryFiles.length > 0) && result.id) {
          const failedFiles: string[] = [];
          const uploadsToProcess: { file: File; isMain: boolean }[] = [
            ...(queuedMainFile ? [{ file: queuedMainFile, isMain: true }] : []),
            ...queuedComplementaryFiles.map((file) => ({ file, isMain: false })),
          ];

          for (const { file, isMain } of uploadsToProcess) {
            try {
              const mediaId = await uploadFile(file, `work-instructions/${result.id}`);
              const evidenceResult = await addWorkInstructionEvidence(
                result.id,
                mediaId,
                undefined,
                isMain
              );
              if (!evidenceResult.success) failedFiles.push(file.name);
            } catch {
              failedFiles.push(file.name);
            }
          }
          if (failedFiles.length > 0) {
            setError(
              `La instrucción de trabajo se creó, pero no se pudieron adjuntar: ${failedFiles.join(", ")}. Puedes intentarlo de nuevo desde "Editar".`
            );
            return;
          }
        }
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
      <DialogContent className="grid max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <div className="border-border border-b p-4 pr-12 sm:p-6 sm:pr-12">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Editar instrucción de trabajo" : "Nueva instrucción de trabajo"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Revisa cada sección y guarda los cambios al terminar."
                : "Define la información, modalidad, defectos, colaboradores y documentos de la instrucción."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
              <section className="border-border space-y-4 rounded-lg border p-4" aria-labelledby="wi-information-heading">
                <div>
                  <h3 id="wi-information-heading" className="text-sm font-semibold">Información</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Servicio, pieza, vigencia y condición que debe revisarse.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="service_id">Servicio *</Label>
                    <Select
                      value={formData.service_id}
                      onValueChange={(value) => handleChange("service_id", value)}
                      disabled={isPending || (!isEditMode && !!defaultServiceId)}
                    >
                      <SelectTrigger id="service_id">
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
                    <Label htmlFor="part_name">Pieza *</Label>
                    <Input
                      id="part_name"
                      list="parts-suggestions"
                      value={formData.part_name}
                      onChange={(e) => handleChange("part_name", e.target.value)}
                      placeholder="Escriba el nombre, número de parte o descripción"
                      disabled={isPending}
                      autoComplete="off"
                    />
                    <datalist id="parts-suggestions">
                      {parts.map((part) => (
                        <option key={part.id} value={part.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">Fecha de inicio de la contención *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleChange("start_date", e.target.value)}
                      disabled={isPending}
                      required
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="description">Descripción</Label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(value) => handleChange("description", value)}
                      disabled={isPending}
                      placeholder="Escribe la descripción de la instrucción de trabajo..."
                      className="min-h-[220px]"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="problem">Problema o condición revisada</Label>
                    <Textarea id="problem" value={formData.problem} onChange={(e) => handleChange("problem", e.target.value)} disabled={isPending} placeholder="Describe qué debe revisar el inspector" rows={3} />
                  </div>
                </div>
              </section>

              <section className="border-border space-y-4 rounded-lg border p-4" aria-labelledby="wi-mode-heading">
                <div>
                  <h3 id="wi-mode-heading" className="text-sm font-semibold">Modalidad</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Define si la inspección usa un rate por hora o tiempo completo.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Modalidad de inspección *</Label>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-2">
                      {(["rate", "full_time"] as const).map((mode) => (
                        <label key={mode} className="hover:bg-muted flex min-h-11 cursor-pointer items-center gap-2 rounded p-2">
                          <input type="radio" name="inspection_mode" value={mode} checked={formData.inspection_mode === mode} onChange={() => handleChange("inspection_mode", mode)} disabled={isPending} />
                          {mode === "rate" ? "Rate" : "Full time"}
                        </label>
                      ))}
                    </div>
                  </div>
                  {formData.inspection_mode === "rate" ? (
                    <div className="grid content-start gap-2">
                      <Label htmlFor="inspection_rate_per_hour">Piezas por hora *</Label>
                      <Input id="inspection_rate_per_hour" type="number" min="1" value={formData.inspection_rate_per_hour} onChange={(e) => handleChange("inspection_rate_per_hour", e.target.value)} disabled={isPending} required />
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="border-border space-y-3 rounded-lg border p-4" aria-labelledby="wi-defects-heading">
                <div>
                  <h3 id="wi-defects-heading" className="text-sm font-semibold">Defectos ({selectedDefects.length})</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Defectos disponibles durante la captura de esta instrucción.</p>
                </div>
                  <div className="border-border space-y-1 rounded-lg border p-2">
                    {defects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay defectos en el catálogo</p>
                    ) : (
                      defects.map((defect) => (
                        <div
                          key={defect.id}
                          className="hover:bg-muted/50 flex items-center space-x-3 rounded p-2"
                        >
                          <Checkbox
                            id={`defect-${defect.id}`}
                            checked={selectedDefects.includes(defect.id)}
                            onCheckedChange={() => handleDefectToggle(defect.id)}
                            disabled={isPending}
                          />
                          <label
                            htmlFor={`defect-${defect.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <span className="font-medium">{defect.name}</span>
                            {defect.description && (
                              <span className="block text-xs text-muted-foreground">
                                {defect.description}
                              </span>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={newDefectName}
                      onChange={(e) => setNewDefectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); void handleAddDefect(); }
                      }}
                      placeholder="Escriba un defecto nuevo..."
                      disabled={isPending || isAddingDefect}
                    />
                    <Button type="button" variant="outline" onClick={handleAddDefect} disabled={!newDefectName.trim() || isPending || isAddingDefect}>
                      Agregar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Los defectos nuevos se guardan en el catálogo y quedan asociados a esta IT.
                  </p>
              </section>

              <section className="border-border space-y-3 rounded-lg border p-4" aria-labelledby="wi-collaborators-heading">
                <div>
                  <h3 id="wi-collaborators-heading" className="text-sm font-semibold">Colaboradores ({selectedCollaborators.length})</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Personal asignado a esta instrucción de trabajo.</p>
                </div>
                <div className="border-border space-y-1 rounded-lg border p-2">
                  {users.length === 0 ? (
                    <p className="text-muted-foreground p-2 text-sm">No hay usuarios disponibles</p>
                  ) : users.map((user) => (
                    <div key={user.id} className="hover:bg-muted/50 flex items-center space-x-3 rounded p-2">
                      <Checkbox id={`user-${user.id}`} checked={selectedCollaborators.includes(user.id)} onCheckedChange={() => handleCollaboratorToggle(user.id)} disabled={isPending} />
                      <label htmlFor={`user-${user.id}`} className="min-w-0 flex-1 cursor-pointer text-sm">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-muted-foreground ml-2">({user.email})</span>
                        {user.role ? <span className="bg-primary/10 text-primary ml-2 rounded-full px-2 py-0.5 text-xs">{user.role}</span> : null}
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-border space-y-3 rounded-lg border p-4" aria-labelledby="wi-documents-heading">
                <div>
                  <h3 id="wi-documents-heading" className="text-sm font-semibold">Documentos (
                    {existingFiles.length +
                      (queuedMainFile ? 1 : 0) +
                      queuedComplementaryFiles.length}
                    )</h3>
                  <p className="text-muted-foreground mt-1 text-xs">IT principal firmada y documentos complementarios.</p>
                </div>
                  <WorkInstructionFiles
                    workInstructionId={workInstructionId ?? null}
                    existingFiles={existingFiles}
                    onFilesChange={setExistingFiles}
                    disabled={isPending}
                    queuedMainFile={queuedMainFile}
                    onQueuedMainFileChange={setQueuedMainFile}
                    queuedComplementaryFiles={queuedComplementaryFiles}
                    onQueuedComplementaryFilesChange={setQueuedComplementaryFiles}
                  />
              </section>

              {error && <p className="text-destructive text-sm" role="alert">{error}</p>}

              <p className="text-muted-foreground text-xs">Los campos marcados con * son obligatorios.</p>
            </div>

            <DialogFooter className="border-border shrink-0 gap-2 border-t p-4 sm:p-6">
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
                  : (isEditMode ? "Guardar cambios" : "Crear instrucción")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
