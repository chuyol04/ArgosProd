"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getServiceDetails } from "@/app/(protected)/services/actions/services.actions";
import { IServiceDetails } from "@/app/(protected)/services/types/services.types";

interface ServiceDetailsModalProps {
  serviceId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ServiceDetailsModal({
  serviceId,
  open,
  onOpenChange,
}: ServiceDetailsModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<IServiceDetails | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setError(null);
      setDetails(null);
    }
  }, [open]);

  // Fetch service details when modal opens
  useEffect(() => {
    if (open && serviceId) {
      setIsLoading(true);
      setError(null);
      getServiceDetails(serviceId)
        .then((result) => {
          if (result.success && result.data) {
            setDetails(result.data);
          } else {
            setError(result.error || "Error al cargar detalles");
          }
        })
        .catch(() => {
          setError("Error al cargar detalles");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, serviceId]);

  const handleGoToITs = () => {
    if (serviceId) {
      onOpenChange(false);
      router.push(`/instrucciones-trabajo?service_id=${serviceId}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Servicio</DialogTitle>
          <DialogDescription>
            {details?.service?.name || "Cargando..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-4 text-center text-destructive">{error}</div>
        ) : details ? (
          <div className="space-y-6">
            {/* Service Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              <p className="text-sm">{details.client.name}</p>
              <p className="text-xs text-muted-foreground">{details.client.email}</p>
            </div>

            {/* Work Instructions Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Instrucciones de Trabajo ({details.work_instructions.length})
              </h3>
              {details.work_instructions.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">ID</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Pieza</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Piezas/Hora</th>
                        <th className="p-2 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.work_instructions.map((wi, index) => (
                        <tr
                          key={wi.id}
                          className={index !== details.work_instructions.length - 1 ? "border-b" : ""}
                        >
                          <td className="p-2">{wi.id}</td>
                          <td className="p-2">{wi.part_name}</td>
                          <td className="p-2">{wi.inspection_rate_per_hour}</td>
                          <td className="p-2 text-muted-foreground">
                            {wi.description || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay instrucciones de trabajo asociadas.
                </p>
              )}
              <Button onClick={handleGoToITs} variant="outline" className="w-full">
                Ir a Instrucciones de Trabajo
              </Button>
            </div>

            {/* Collaborators */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Colaboradores ({details.collaborators.length})
              </h3>
              {details.collaborators.length > 0 ? (
                <div className="space-y-2">
                  {details.collaborators.map((collab) => (
                    <div
                      key={collab.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{collab.name}</p>
                        <p className="text-xs text-muted-foreground">{collab.email}</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {collab.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay colaboradores asociados.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
