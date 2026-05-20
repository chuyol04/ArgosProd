"use client";

import { useMemo, useState } from "react";
import { IDefectsResponse } from "@/app/(protected)/defects/types/defects.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import DefectDetailModal from "./DefectDetailModal";
import DefectModal from "./DefectModal";
import { deleteDefect } from "@/app/(protected)/defects/actions/defects.actions";
import PageContainer from "@/components/layout/PageContainer";

type ModalMode = "create" | "edit";

type Props = {
  initialData: IDefectsResponse;
};

export default function DefectsTable({ initialData }: Props) {
  const [search, setSearch] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null);

  const openDetail = (id: number) => {
    setSelectedDetailId(id);
    setDetailOpen(true);
  };

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedDefectId(id);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este defecto?")) return;
    const result = await deleteDefect(id);
    if (!result.success) alert(result.error || "Error al eliminar defecto");
  };

  const defects = useMemo(() => {
    const all = initialData.defects ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
    );
  }, [initialData.defects, search]);

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-xl font-bold text-balance lg:text-3xl">
            Catálogo de Defectos
          </h1>
          <Button onClick={() => openModal("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Defecto
          </Button>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="search">Buscar:</Label>
          <Input
            id="search"
            placeholder="Buscar por nombre o descripción..."
            className="max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table - Desktop */}
        <div className="border-border hidden overflow-hidden rounded-lg border md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">ID</th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">Nombre</th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">Descripción</th>
                  <th className="text-muted-foreground p-3 text-center text-xs font-medium lg:p-4 lg:text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {defects.map((defect, index) => (
                  <tr
                    key={defect.id}
                    className={index !== defects.length - 1 ? "border-border border-b" : ""}
                  >
                    <td className="text-muted-foreground p-3 text-xs lg:p-4 lg:text-sm">{defect.id}</td>
                    <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm font-medium">{defect.name}</td>
                    <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm max-w-xs truncate">
                      {defect.description || <span className="text-muted-foreground italic">Sin descripción</span>}
                    </td>
                    <td className="p-3 text-center lg:p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(defect.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal("edit", defect.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Actualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(defect.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Borrar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {defects.length === 0 && (
                  <tr>
                    <td className="text-muted-foreground p-4 text-sm" colSpan={4}>
                      {search ? "No se encontraron defectos con esa búsqueda." : "No hay defectos registrados."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards - Mobile */}
        <div className="space-y-3 md:hidden">
          {defects.map((defect) => (
            <div key={defect.id} className="border-border bg-card space-y-2 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-card-foreground text-sm font-medium">{defect.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">ID: {defect.id}</p>
                  <p className="text-muted-foreground mt-1 text-xs truncate">
                    {defect.description || "Sin descripción"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDetail(defect.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModal("edit", defect.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Actualizar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(defect.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Borrar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {defects.length === 0 && (
            <div className="text-muted-foreground text-sm">
              {search ? "No se encontraron defectos con esa búsqueda." : "No hay defectos registrados."}
            </div>
          )}
        </div>
      </div>

      <DefectDetailModal
        defectId={selectedDetailId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <DefectModal
        defectId={selectedDefectId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
      />
    </PageContainer>
  );
}
