"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchDefects,
  fetchIncidentsByDetail,
  createIncident,
  updateIncident,
  deleteIncident,
  removeIncidentEvidence,
  IDefect,
  IIncident,
} from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";
import { deleteMediaIfExists } from "@/lib/storage/deleteMedia";
import { uploadFile, getFileCategory } from "@/lib/storage/fileUpload";
import { MediaItem } from "@/components/ui/media-item";
import { ISerialLotInput, ISerialNumber } from "@/app/(protected)/detalles-inspeccion/types/detalles-inspeccion.types";
import { boxDefectQuantity, pendingBoxKey } from "@/lib/inspectionBox";
import {
  Plus,
  Pencil,
  Trash2,
  Image as ImageIcon,
  File as FileIcon,
  AlertTriangle,
  Loader2,
  Upload,
  Camera,
  X,
} from "lucide-react";

interface DefectsSectionProps {
  inspectionDetailId: number | null;
  workInstructionId?: number;
  rejectedPieces?: number;
  disabled?: boolean;
  /** Reports the sum of all defect quantities for this box, so the parent
   * form can warn when it doesn't match the rejected pieces count. Sourced
   * from saved incidents when the detail already exists, or from the
   * not-yet-saved pending defects while creating one. */
  onTotalQuantityChange?: (total: number) => void;
  serialBoxes?: ISerialNumber[];
  pendingSerialBoxes?: ISerialLotInput[];
}

// A defect captured before the inspection detail itself has been saved.
// Kept purely in memory - no upload, no incident row - until the parent
// form creates the detail and calls commitPendingDefects with its new id.
interface IPendingDefect {
  tempId: string;
  defect_id: number;
  defect_label: string;
  quantity: number;
  evidenceFile?: File;
  evidencePreview?: string | null;
  boxKey: string;
}

export interface DefectsSectionHandle {
  validateDistribution: () => string | null;
  /** Uploads evidence and creates an incident for every pending defect,
   * relating them to the just-created inspection detail. Returns the labels
   * of any defects that failed, so the caller can surface them without
   * blocking navigation to the record that was already created. */
  commitPendingDefects: (inspectionDetailId: number, createdSerials: ISerialNumber[]) => Promise<string[]>;
}

export const DefectsSection = forwardRef<DefectsSectionHandle, DefectsSectionProps>(
  function DefectsSection({ inspectionDetailId, workInstructionId, disabled = false, onTotalQuantityChange, serialBoxes = [], pendingSerialBoxes = [] }, ref) {
  const isPendingMode = inspectionDetailId == null;

  const [defects, setDefects] = useState<IDefect[]>([]);
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [pendingDefects, setPendingDefects] = useState<IPendingDefect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form state
  const [selectedDefectId, setSelectedDefectId] = useState<string>("");
  const [selectedBox, setSelectedBox] = useState("");
  const [quantity, setQuantity] = useState("");
  const selectedBoxRejectedQuantity = boxDefectQuantity(isPendingMode
    ? pendingSerialBoxes.find((box) => pendingBoxKey(box) === selectedBox)
    : serialBoxes.find((box) => String(box.id) === selectedBox));
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [removingEvidenceId, setRemovingEvidenceId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Which existing entry (if any) the modal is currently editing.
  const [editingSavedId, setEditingSavedId] = useState<number | null>(null);
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const isEditing = editingSavedId != null || editingPendingId != null;

  // Load defects catalog and, when the detail already exists, its incidents.
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const defectsData = await fetchDefects(workInstructionId);
        setDefects(defectsData);

        if (inspectionDetailId) {
          const incidentsData = await fetchIncidentsByDetail(inspectionDetailId);
          setIncidents(incidentsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [inspectionDetailId, workInstructionId]);

  // Keep the parent form informed of the total defect quantity for this box,
  // whether it comes from saved incidents or still-pending defects.
  useEffect(() => {
    const source = isPendingMode ? pendingDefects : incidents;
    const total = source.reduce((sum, i) => sum + (i.quantity || 0), 0);
    onTotalQuantityChange?.(total);
  }, [incidents, pendingDefects, isPendingMode, onTotalQuantityChange]);

  const resetModal = useCallback(() => {
    setSelectedDefectId("");
    setSelectedBox("");
    setQuantity("");
    setEvidenceFile(null);
    setEvidencePreview(null);
    setUploadProgress(0);
    setEditingSavedId(null);
    setEditingPendingId(null);
  }, []);

  useEffect(() => {
    if (!isPendingMode) return;
    setPendingDefects([]);
    resetModal();
  }, [isPendingMode, workInstructionId, resetModal]);

  const handleOpenAddModal = () => {
    if (defects.length === 0) {
      alert("La instrucción de trabajo no tiene defectos asociados");
      return;
    }
    resetModal();
    setIsModalOpen(true);
  };

  const handleOpenEditSaved = (incident: IIncident) => {
    setSelectedDefectId(incident.defect_id ? String(incident.defect_id) : "");
    setSelectedBox(incident.inspection_detail_serial_number_id ? String(incident.inspection_detail_serial_number_id) : "");
    setQuantity(incident.quantity ? String(incident.quantity) : "");
    setEvidenceFile(null);
    setEvidencePreview(null);
    setUploadProgress(0);
    setEditingSavedId(incident.id);
    setEditingPendingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditPending = (pending: IPendingDefect) => {
    setSelectedDefectId(String(pending.defect_id));
    setSelectedBox(pending.boxKey);
    setQuantity(String(pending.quantity));
    setEvidenceFile(pending.evidenceFile ?? null);
    // Use a fresh object URL for the modal preview so removing/replacing the
    // file while editing never revokes the URL the list thumbnail relies on.
    setEvidencePreview(
      pending.evidenceFile && getFileCategory(pending.evidenceFile) === "image"
        ? URL.createObjectURL(pending.evidenceFile)
        : null
    );
    setUploadProgress(0);
    setEditingSavedId(null);
    setEditingPendingId(pending.tempId);
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite de 10MB");
      return;
    }

    if (getFileCategory(file) !== "image") {
      alert("Selecciona una imagen");
      return;
    }

    setEvidenceFile(file);
    if (getFileCategory(file) === "image") {
      setEvidencePreview(URL.createObjectURL(file));
    } else {
      setEvidencePreview(null);
    }
  };

  const handleRemoveFile = () => {
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }
    setEvidenceFile(null);
    setEvidencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const quantityAssignedToSelectedBox = (isPendingMode ? pendingDefects : incidents).reduce(
    (sum, item) => {
      const belongsToBox = isPendingMode
        ? (item as IPendingDefect).boxKey === selectedBox
        : String((item as IIncident).inspection_detail_serial_number_id) === selectedBox;
      const isCurrentEntry = isPendingMode
        ? (item as IPendingDefect).tempId === editingPendingId
        : (item as IIncident).id === editingSavedId;
      return belongsToBox && !isCurrentEntry ? sum + (item.quantity || 0) : sum;
    },
    0
  );
  const availableQuantity = Math.max(
    0,
    (selectedBoxRejectedQuantity ?? 0) - quantityAssignedToSelectedBox
  );

  const handleSubmit = async () => {
    const selectedDefect = defects.find((defect) => String(defect.id) === selectedDefectId);
    if (!selectedDefect) {
      alert("Selecciona un defecto asociado a la instrucción de trabajo");
      return;
    }
    if (!selectedBox) {
      alert("Selecciona la caja/serie a la que pertenece el defecto");
      return;
    }
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      alert("La cantidad debe ser un entero mayor que cero");
      return;
    }
    if (selectedBoxRejectedQuantity == null || selectedBoxRejectedQuantity <= 0) {
      alert("La caja seleccionada debe tener piezas rechazadas registradas");
      return;
    }
    if (parsedQuantity > availableQuantity) {
      alert(`Solo quedan ${availableQuantity} piezas rechazadas por asignar en esta caja`);
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Editing a defect that was already saved to the database.
      if (editingSavedId != null) {
        const existing = incidents.find((i) => i.id === editingSavedId);
        let newEvidenceUrl: string | undefined;
        if (evidenceFile) {
          newEvidenceUrl = await uploadFile(
            evidenceFile,
            `defects/${inspectionDetailId}`,
            (progress) => setUploadProgress(progress.progress)
          );
        }

        const result = await updateIncident(editingSavedId, {
          defect_id: selectedDefect.id,
          quantity: parsedQuantity,
          inspection_detail_serial_number_id: Number(selectedBox),
          ...(newEvidenceUrl ? { evidence_url: newEvidenceUrl } : {}),
        });

        if (result.success) {
          if (newEvidenceUrl && existing?.evidence_url) {
            await deleteMediaIfExists(existing.evidence_url);
          }
          const incidentsData = await fetchIncidentsByDetail(inspectionDetailId!);
          setIncidents(incidentsData);
          setIsModalOpen(false);
          resetModal();
        } else {
          alert(result.error || "Error al actualizar defecto");
        }
        return;
      }

      // Editing a defect that hasn't been saved yet (create-mode).
      if (editingPendingId != null) {
        setPendingDefects((prev) =>
          prev.map((p) =>
            p.tempId === editingPendingId
              ? {
                  ...p,
                  defect_id: selectedDefect.id,
                  defect_label: selectedDefect.name,
                  quantity: parsedQuantity,
                  boxKey: selectedBox,
                  evidenceFile: evidenceFile ?? undefined,
                  evidencePreview,
                }
              : p
          )
        );
        setIsModalOpen(false);
        resetModal();
        return;
      }

      // Adding a brand new defect.
      if (isPendingMode) {
        // No detail id yet - keep it in memory, upload/save happens on
        // commitPendingDefects once the parent form creates the detail.
        setPendingDefects((prev) => [
          ...prev,
          {
            tempId:
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `pending-${Date.now()}-${Math.random()}`,
            defect_id: selectedDefect.id,
            defect_label: selectedDefect.name,
            quantity: parsedQuantity,
            boxKey: selectedBox,
            evidenceFile: evidenceFile ?? undefined,
            evidencePreview,
          },
        ]);
        setIsModalOpen(false);
        resetModal();
        return;
      }

      // Detail already exists - save immediately as before.
      let evidenceUrl: string | undefined;
      if (evidenceFile) {
        evidenceUrl = await uploadFile(
          evidenceFile,
          `defects/${inspectionDetailId}`,
          (progress) => setUploadProgress(progress.progress)
        );
      }

      const result = await createIncident({
        defect_id: selectedDefect.id,
        inspection_detail_id: inspectionDetailId!,
        quantity: parsedQuantity,
        inspection_detail_serial_number_id: Number(selectedBox),
        evidence_url: evidenceUrl,
      });

      if (result.success) {
        const incidentsData = await fetchIncidentsByDetail(inspectionDetailId!);
        setIncidents(incidentsData);
        setIsModalOpen(false);
        resetModal();
      } else {
        alert(result.error || "Error al crear incidente");
      }
    } catch (error) {
      console.error("Error saving defect:", error);
      alert("Error al guardar defecto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSaved = async (incidentId: number) => {
    if (!confirm("¿Estás seguro de eliminar este defecto?")) return;

    setDeletingId(incidentId);
    try {
      const result = await deleteIncident(incidentId);
      if (result.success) {
        setIncidents((prev) => prev.filter((i) => i.id !== incidentId));
      } else {
        alert(result.error || "Error al eliminar defecto");
      }
    } catch (error) {
      console.error("Error deleting incident:", error);
      alert("Error al eliminar defecto");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePending = (tempId: string) => {
    if (!confirm("¿Estás seguro de eliminar este defecto?")) return;
    setPendingDefects((prev) => {
      const target = prev.find((p) => p.tempId === tempId);
      if (target?.evidencePreview) URL.revokeObjectURL(target.evidencePreview);
      return prev.filter((p) => p.tempId !== tempId);
    });
  };

  // Removes only the evidence file from an already-saved defect (e.g. it was
  // uploaded by mistake), keeping the defect entry itself intact.
  const handleRemoveEvidence = async (incident: IIncident) => {
    if (!incident.evidence_url) return;
    if (!confirm("¿Eliminar la evidencia de este defecto?")) return;

    setRemovingEvidenceId(incident.id);
    try {
      const result = await removeIncidentEvidence(incident.id, incident.evidence_url);
      if (result.success) {
        setIncidents((prev) =>
          prev.map((i) => (i.id === incident.id ? { ...i, evidence_url: null } : i))
        );
      } else {
        alert(result.error || "Error al eliminar evidencia");
      }
    } catch (error) {
      console.error("Error removing evidence:", error);
      alert("Error al eliminar evidencia");
    } finally {
      setRemovingEvidenceId(null);
    }
  };

  // Called by the parent form right after it creates the inspection detail -
  // uploads evidence and creates an incident for every defect gathered while
  // the detail didn't exist yet.
  const validateDistribution = useCallback((): string | null => {
    const boxes = isPendingMode ? pendingSerialBoxes : serialBoxes;
    const entries = isPendingMode ? pendingDefects : incidents;
    const boxKey = (box: ISerialLotInput | ISerialNumber) =>
      isPendingMode ? pendingBoxKey(box as ISerialLotInput) : String((box as ISerialNumber).id);
    const entryBoxKey = (entry: IPendingDefect | IIncident) =>
      isPendingMode
        ? (entry as IPendingDefect).boxKey
        : String((entry as IIncident).inspection_detail_serial_number_id ?? "");

    if (entries.some((entry) => !boxes.some((box) => boxKey(box) === entryBoxKey(entry)))) {
      return "Hay defectos asociados a una caja que ya no está disponible.";
    }

    for (const [index, box] of boxes.entries()) {
      const rejected = boxDefectQuantity(box) ?? 0;
      const assigned = entries
        .filter((entry) => entryBoxKey(entry) === boxKey(box))
        .reduce((sum, entry) => sum + (entry.quantity || 0), 0);
      if (assigned !== rejected) {
        return `La caja ${index + 1} tiene ${rejected} piezas rechazadas, pero ${assigned} distribuidas entre defectos.`;
      }
    }
    return null;
  }, [incidents, isPendingMode, pendingDefects, pendingSerialBoxes, serialBoxes]);

  const commitPendingDefects = useCallback(
    async (newDetailId: number, createdSerials: ISerialNumber[]): Promise<string[]> => {
      const failed: string[] = [];
      for (const pending of pendingDefects) {
        try {
          // The API returns boxes in submission order; series can be empty or lots repeated.
          const boxIndex = pendingSerialBoxes.findIndex((box) => pendingBoxKey(box) === pending.boxKey);
          const serialId = createdSerials[boxIndex]?.id;
          const rejectedQuantity = boxDefectQuantity(createdSerials[boxIndex]);
          if (!serialId || rejectedQuantity == null || rejectedQuantity <= 0) {
            failed.push(`${pending.defect_label} (caja sin rechazadas o no disponible)`);
            continue;
          }
          let evidenceUrl: string | undefined;
          if (pending.evidenceFile) {
            evidenceUrl = await uploadFile(pending.evidenceFile, `defects/${newDetailId}`);
          }
          const result = await createIncident({
            defect_id: pending.defect_id,
            inspection_detail_id: newDetailId,
            inspection_detail_serial_number_id: serialId,
            quantity: pending.quantity,
            evidence_url: evidenceUrl,
          });
          if (!result.success) failed.push(pending.defect_label);
        } catch {
          failed.push(pending.defect_label);
        }
      }
      return failed;
    },
    [pendingDefects, pendingSerialBoxes]
  );

  useImperativeHandle(
    ref,
    () => ({ commitPendingDefects, validateDistribution }),
    [commitPendingDefects, validateDistribution]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const entryCount = isPendingMode ? pendingDefects.length : incidents.length;
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Defectos Encontrados ({entryCount})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenAddModal}
          disabled={disabled || defects.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {!isLoading && defects.length === 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Asocia al menos un defecto a la instrucción de trabajo para poder capturarlo.
        </p>
      )}

      {/* Entries list */}
      {entryCount === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/20">
          No se han registrado defectos
        </div>
      ) : (
        <div className="space-y-2">
          {isPendingMode
            ? pendingDefects.map((pending) => (
                <div
                  key={pending.tempId}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  {pending.evidencePreview ? (
                    <img
                      src={pending.evidencePreview}
                      alt="Evidencia"
                      className="h-12 w-12 rounded border object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="break-words text-sm font-medium">{pending.defect_label}</p>
                    <p className="text-xs text-muted-foreground">Cantidad: {pending.quantity}</p>
                    <p className="text-xs text-muted-foreground">Caja: {pendingSerialBoxes.findIndex((box) => pendingBoxKey(box) === pending.boxKey) + 1 || "No disponible"}</p>
                  </div>

                  {!disabled && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditPending(pending)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePending(pending.tempId)}
                        disabled={deletingId === pending.tempId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            : incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  {/* Evidence thumbnail - optional, one image represents the whole defect/quantity */}
                  {incident.evidence_url && /^[a-f0-9]{24}$/.test(incident.evidence_url) ? (
                    <div className="relative flex-shrink-0">
                      <MediaItem mediaId={incident.evidence_url} size="sm" />
                      {!disabled && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-5 w-5 rounded-full"
                          onClick={() => handleRemoveEvidence(incident)}
                          disabled={removingEvidenceId === incident.id}
                          title="Eliminar evidencia"
                        >
                          {removingEvidenceId === incident.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="break-words text-sm font-medium">{incident.defect_name}</p>
                    {incident.quantity != null && (
                      <p className="text-xs text-muted-foreground">
                        Cantidad: {incident.quantity}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Serie: {incident.inspection_serial_number || "-"} · Lote: {incident.inspection_lot_number || "-"}</p>
                  </div>

                  {/* Edit / Delete buttons */}
                  {!disabled && (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditSaved(incident)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteSaved(incident.id)}
                        disabled={deletingId === incident.id}
                      >
                        {deletingId === incident.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
        </div>
      )}

      {/* Add/Edit Defect Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Defecto" : "Agregar Defecto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="defect-box">Caja / serie o lote *</Label>
              <Select
                value={selectedBox}
                onValueChange={(value) => {
                  setSelectedBox(value);
                  setQuantity("");
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="defect-box"><SelectValue placeholder="Selecciona una caja..." /></SelectTrigger>
                <SelectContent>
                  {(isPendingMode ? pendingSerialBoxes : serialBoxes).map((box, index) => (
                    <SelectItem key={isPendingMode ? pendingBoxKey(box as ISerialLotInput) : (box as ISerialNumber).id} value={isPendingMode ? pendingBoxKey(box as ISerialLotInput) : String((box as ISerialNumber).id)}>
                      Caja {index + 1} · Serie {box.serial_number || "-"} · Lote {box.lot_number || "-"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defect-catalog">Defecto de la instrucción de trabajo *</Label>
              <Select
                value={selectedDefectId}
                onValueChange={setSelectedDefectId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="defect-catalog">
                  <SelectValue placeholder="Selecciona un defecto asociado..." />
                </SelectTrigger>
                <SelectContent>
                  {defects.map((defect) => (
                    <SelectItem key={defect.id} value={String(defect.id)}>
                      {defect.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableQuantity || undefined}
                step="1"
                placeholder="Ej: 10"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                aria-describedby="defect-quantity-help"
                disabled={isSubmitting || !selectedBox}
              />
              <p id="defect-quantity-help" className="text-xs text-muted-foreground">
                {selectedBox && (selectedBoxRejectedQuantity == null || selectedBoxRejectedQuantity === 0)
                  ? "Esta caja no tiene piezas rechazadas registradas."
                  : selectedBox
                    ? `${availableQuantity} de ${selectedBoxRejectedQuantity} rechazadas disponibles por asignar.`
                    : "Selecciona una caja para capturar la cantidad."}
              </p>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-2">
              <Label>Evidencia (Foto)</Label>
              {evidenceFile && (
                <div className="relative border rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    {evidencePreview ? (
                      <img
                        src={evidencePreview}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{evidenceFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(evidenceFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleRemoveFile}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} className="h-1 mt-2" />
                  )}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={isSubmitting}>
                  <Camera className="h-4 w-4 mr-2" />Tomar foto
                </Button>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                  <Upload className="h-4 w-4 mr-2" />Seleccionar imagen
                </Button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !selectedDefectId ||
                !selectedBox ||
                !Number.isInteger(Number(quantity)) ||
                Number(quantity) <= 0 ||
                Number(quantity) > availableQuantity
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  }
);
