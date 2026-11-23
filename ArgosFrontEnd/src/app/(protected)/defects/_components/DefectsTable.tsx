"use client";

import { useMemo, useState } from "react";
import { IDefectsResponse } from "@/app/(protected)/defects/types/defects.types";
import { Button } from "@/components/ui/button";
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
import { useUser } from "@/contexts/users/userContext";
import { isInspectorOnly as hasOnlyInspectorRole } from "@/lib/constants/roles";
import {
  CatalogEmptyState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearch,
} from "@/components/common/CatalogPageElements";

type ModalMode = "create" | "edit";

type Props = {
  initialData: IDefectsResponse;
};

export default function DefectsTable({ initialData }: Props) {
  const { user } = useUser();
  const isInspectorOnly = hasOnlyInspectorRole(user?.roles ?? []);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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

  const filteredDefects = useMemo(() => {
    const all = initialData.defects ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
    );
  }, [initialData.defects, search]);

  const defects = filteredDefects.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  const hasMore = currentPage * rowsPerPage < filteredDefects.length;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const changeLimit = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <CatalogPageHeader
          title="Defectos"
          description="Consulta los defectos que pueden asociarse a las instrucciones de trabajo y a cada caja inspeccionada."
          readOnly={isInspectorOnly}
          action={!isInspectorOnly ? (
            <Button className="w-full sm:w-auto" onClick={() => openModal("create")}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nuevo defecto
            </Button>
          ) : undefined}
        />

        {/* Search */}
        <CatalogSearch
          id="defects-search"
          label="Buscar defectos"
          placeholder="Nombre o descripción"
          value={search}
          onChange={handleSearchChange}
          onSubmit={() => setCurrentPage(1)}
        />

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
                          <Button variant="ghost" size="icon" aria-label={`Acciones para ${defect.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetail(defect.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalle
                          </DropdownMenuItem>
                          {!isInspectorOnly ? (
                            <>
                              <DropdownMenuItem onClick={() => openModal("edit", defect.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar defecto
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(defect.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar defecto
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {defects.length === 0 && (
                  <tr>
                    <td className="text-muted-foreground p-8 text-center text-sm" colSpan={4}>
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
                    <Button variant="ghost" size="icon" aria-label={`Acciones para ${defect.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDetail(defect.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalle
                    </DropdownMenuItem>
                    {!isInspectorOnly ? (
                      <>
                        <DropdownMenuItem onClick={() => openModal("edit", defect.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar defecto
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(defect.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar defecto
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {defects.length === 0 && (
            <CatalogEmptyState
              title={search ? "Sin resultados" : "Aún no hay defectos"}
              description={search ? "Prueba con otro nombre o descripción." : "Los defectos aparecerán aquí cuando se registren."}
            />
          )}
        </div>

        <CatalogPagination
          rowsPerPage={rowsPerPage}
          currentPage={currentPage}
          hasMore={hasMore}
          onRowsPerPageChange={changeLimit}
          onGoToPage={setCurrentPage}
          total={filteredDefects.length}
        />
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
