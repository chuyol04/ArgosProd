"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  deleteIncident,
  IDefect,
  IIncident,
} from "@/app/(protected)/detalles-inspeccion/actions/incidents.actions";
import { uploadFile, getFileCategory } from "@/lib/storage/fileUpload";
import { MediaItem } from "@/components/ui/media-item";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  File as FileIcon,
  AlertTriangle,
  Loader2,
  Upload,
  X,
} from "lucide-react";

interface DefectsSectionProps {
  inspectionDetailId: number | null;
  disabled?: boolean;
}

export function DefectsSection({
  inspectionDetailId,
  disabled = false,
}: DefectsSectionProps) {
  const [defects, setDefects] = useState<IDefect[]>([]);
  const [incidents, setIncidents] = useState<IIncident[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form state
  const [selectedDefectId, setSelectedDefectId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load defects catalog and incidents
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const defectsData = await fetchDefects();
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
  }, [inspectionDetailId]);

  const resetModal = useCallback(() => {
    setSelectedDefectId("");
    setQuantity("");
    setEvidenceFile(null);
    setEvidencePreview(null);
    setUploadProgress(0);
  }, []);

  const handleOpenModal = () => {
    if (!inspectionDetailId) {
      alert("Guarda el detalle de inspección primero para agregar defectos.");
      return;
    }
    resetModal();
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo excede el límite de 10MB");
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

  const handleSubmit = async () => {
    if (!selectedDefectId || !inspectionDetailId) {
      alert("Selecciona un tipo de defecto");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let evidenceUrl: string | undefined;

      // Upload evidence file if provided
      if (evidenceFile) {
        evidenceUrl = await uploadFile(
          evidenceFile,
          `defects/${inspectionDetailId}`,
          (progress) => {
            setUploadProgress(progress.progress);
          }
        );
      }

      // Create incident
      const result = await createIncident({
        defect_id: Number(selectedDefectId),
        inspection_detail_id: inspectionDetailId,
        quantity: quantity ? Number(quantity) : undefined,
        evidence_url: evidenceUrl,
      });

      if (result.success) {
        // Reload incidents
        const incidentsData = await fetchIncidentsByDetail(inspectionDetailId);
        setIncidents(incidentsData);
        setIsModalOpen(false);
        resetModal();
      } else {
        alert(result.error || "Error al crear incidente");
      }
    } catch (error) {
      console.error("Error creating incident:", error);
      alert("Error al crear incidente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (incidentId: number) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Defectos Encontrados ({incidents.length})
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenModal}
          disabled={disabled || !inspectionDetailId}
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Incidents List */}
      {incidents.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg bg-muted/20">
          {inspectionDetailId
            ? "No se han registrado defectos"
            : "Guarda el detalle de inspección para agregar defectos"}
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card"
            >
              {/* Evidence thumbnail */}
              {incident.evidence_url && /^[a-f0-9]{24}$/.test(incident.evidence_url) ? (
                <div className="flex-shrink-0">
                  <MediaItem
                    mediaId={incident.evidence_url}
                    size="sm"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {incident.defect_name}
                </p>
                {incident.quantity && (
                  <p className="text-xs text-muted-foreground">
                    Cantidad: {incident.quantity}
                  </p>
                )}
              </div>

              {/* Delete button */}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(incident.id)}
                  disabled={deletingId === incident.id}
                >
                  {deletingId === incident.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Defect Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Defecto</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Defect Type */}
            <div className="space-y-2">
              <Label htmlFor="defect">Tipo de Defecto *</Label>
              <Select
                value={selectedDefectId}
                onValueChange={setSelectedDefectId}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un defecto..." />
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
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="Ej: 5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Evidence Upload */}
            <div className="space-y-2">
              <Label>Evidencia (Foto)</Label>
              {evidenceFile ? (
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
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Click para seleccionar imagen
                  </p>
                </div>
              )}
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
              disabled={isSubmitting || !selectedDefectId}
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
