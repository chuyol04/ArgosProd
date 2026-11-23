"use client";

import { useEffect, useMemo, useState } from "react";
import { IPartsResponse } from "@/app/(protected)/parts/types/parts.types";
import { Button } from "@/components/ui/button";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import PartModal from "./PartModal";
import { deletePart } from "@/app/(protected)/parts/actions/parts.actions";
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
  initialData: IPartsResponse;
};

export default function PartsTable({ initialData }: Props) {
  const { user } = useUser();
  const isInspectorOnly = hasOnlyInspectorRole(user?.roles ?? []);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedPartId(id);
    setModalOpen(true);
  };

  const [qSearch] = useUrlString("search");
  const [qLimit] = useUrlInt("limit", 10);
  const [qPage, setQPage] = useUrlInt("page", 1);
  const setUrlParams = useUrlParams();

  // Local draft so typing stays instant - the URL (and the server refetch it
  // triggers) only updates after the user pauses, instead of on every keystroke.
  const [searchInput, setSearchInput] = useState(qSearch);

  useEffect(() => {
    if (searchInput === qSearch) return;
    const timeout = setTimeout(() => {
      setUrlParams({ search: searchInput || null, page: null });
    }, 350);
    return () => clearTimeout(timeout);
  }, [qSearch, searchInput, setUrlParams]);

  const handleSearch = () => {
    setUrlParams({ search: searchInput || null, page: null });
  };

  const tableRows = useMemo(
    () =>
      (initialData.parts ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || "Sin descripción",
      })),
    [initialData.parts]
  );

  const rowsPerPage = qLimit;
  const currentPage = qPage;
  const total = initialData.total ?? tableRows.length;
  const hasMore = (initialData.parts?.length ?? 0) === rowsPerPage;

  const goToPage = (page: number) => {
    const target = Math.max(page, 1);
    if (target === qPage) return;
    setQPage(target);
  };

  const changeLimit = (limitStr: string) => {
    setUrlParams({ limit: Number(limitStr), page: null });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta pieza?")) return;
    const result = await deletePart(id);
    if (!result.success) alert(result.error || "Error al eliminar pieza");
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <CatalogPageHeader
          title="Piezas"
          description="Consulta el catálogo de piezas disponible para las instrucciones de trabajo."
          readOnly={isInspectorOnly}
          action={!isInspectorOnly ? (
            <Button className="w-full sm:w-auto" onClick={() => openModal("create")}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nueva pieza
            </Button>
          ) : undefined}
        />

        {/* Filters */}
        <CatalogSearch
          id="parts-search"
          label="Buscar piezas"
          placeholder="Nombre o descripción"
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearch}
        />

        {/* Table - Desktop */}
        <div className="border-border hidden overflow-hidden rounded-lg border md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                    ID
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                    Nombre
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                    Descripción
                  </th>
                  <th className="text-muted-foreground p-3 text-center text-xs font-medium lg:p-4 lg:text-sm">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {tableRows.map((record, index) => (
                  <tr
                    key={record.id}
                    className={index !== tableRows.length - 1 ? "border-border border-b" : ""}
                  >
                    <td className="text-muted-foreground p-3 text-xs lg:p-4 lg:text-sm">
                      {record.id}
                    </td>
                    <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm font-medium">
                      {record.name}
                    </td>
                    <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm max-w-xs truncate">
                      {record.description}
                    </td>
                    <td className="p-3 text-center lg:p-4">
                      {isInspectorOnly ? (
                        <span className="text-muted-foreground text-xs">Solo lectura</span>
                      ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Acciones para ${record.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openModal("edit", record.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar pieza
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar pieza
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td className="text-muted-foreground p-8 text-center text-sm" colSpan={4}>
                      No hay piezas que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards - Mobile */}
        <div className="space-y-3 md:hidden">
          {tableRows.map((record) => (
            <div
              key={record.id}
              className="border-border bg-card space-y-2 rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-card-foreground text-sm font-medium">{record.name}</p>
                  <p className="text-muted-foreground mt-1 text-xs">ID: {record.id}</p>
                  <p className="text-muted-foreground mt-1 text-xs truncate">{record.description}</p>
                </div>
                {!isInspectorOnly ? <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Acciones para ${record.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openModal("edit", record.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar pieza
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar pieza
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> : null}
              </div>
            </div>
          ))}
          {tableRows.length === 0 && (
            <CatalogEmptyState
              title={qSearch ? "Sin resultados" : "Aún no hay piezas"}
              description={qSearch ? "Prueba con otro nombre o descripción." : "Las piezas aparecerán aquí cuando se registren."}
            />
          )}
        </div>

        {/* Pagination */}
        <CatalogPagination
          rowsPerPage={rowsPerPage}
          currentPage={currentPage}
          hasMore={hasMore}
          onRowsPerPageChange={changeLimit}
          onGoToPage={goToPage}
          total={total}
        />
      </div>

      <PartModal
        partId={selectedPartId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
      />
    </PageContainer>
  );
}
