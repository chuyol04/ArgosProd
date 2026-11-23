"use client";

import { IWorkInstructionsResponse } from "@/app/(protected)/instrucciones-trabajo/types/instrucciones-trabajo.types";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Plus, Eye } from "lucide-react";
import WorkInstructionModal from "./WorkInstructionModal";
import WorkInstructionDetailsModal from "./WorkInstructionDetailsModal";
import { deleteWorkInstruction } from "@/app/(protected)/instrucciones-trabajo/actions/instrucciones-trabajo.actions";
import PageContainer from "@/components/layout/PageContainer";
import { useUser } from "@/contexts/users/userContext";
import { isInspectorOnly as hasOnlyInspectorRole } from "@/lib/constants/roles";
import {
  CatalogEmptyState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearch,
} from "@/components/common/CatalogPageElements";

type Props = {
  initialData: IWorkInstructionsResponse;
  defaultServiceId?: number;
};

export default function WorkInstructionsTable({ initialData, defaultServiceId }: Props) {
  const { user } = useUser();
  const isInspectorOnly = hasOnlyInspectorRole(user?.roles ?? []);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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

  // Map work instructions to table rows
  const tableRows = useMemo(
    () =>
      (initialData.workInstructions ?? []).map((wi) => ({
        id: wi.id,
        part_name: wi.part_name,
        service_name: wi.service_name || `Servicio #${wi.service_id}`,
        client_name: wi.client_name,
        inspection_rate_per_hour: wi.inspection_rate_per_hour,
        description: wi.description || "-",
      })),
    [initialData.workInstructions]
  );

  // Pagination
  const rowsPerPage = qLimit;
  const currentPage = qPage;
  const hasMore = (initialData.workInstructions?.length ?? 0) === rowsPerPage;

  // Handlers
  const goToPage = (page: number) => {
    const target = Math.max(page, 1);
    if (target === qPage) return;
    setQPage(target);
  };

  const changeLimit = (limitStr: string) => {
    setUrlParams({ limit: Number(limitStr), page: null });
  };

  const handleCreate = () => {
    setSelectedId(null);
    setModalOpen(true);
  };

  const handleUpdate = (id: number) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleViewDetails = (id: number) => {
    setSelectedId(id);
    setDetailsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta instrucción de trabajo?")) return;
    const result = await deleteWorkInstruction(id);
    if (!result.success) {
      alert(result.error || "Error al eliminar instrucción de trabajo");
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <CatalogPageHeader
          title="Instrucciones de trabajo"
          description="Consulta la pieza, el servicio y el cliente que definen cada inspección."
          readOnly={isInspectorOnly}
          action={!isInspectorOnly ? (
            <Button className="w-full sm:w-auto" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nueva instrucción
            </Button>
          ) : undefined}
        />

      {/* Filters */}
      <CatalogSearch
        id="work-instructions-search"
        label="Buscar instrucciones"
        placeholder="Pieza, servicio o cliente"
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
                  Pieza
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Servicio
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Cliente
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
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.id}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.part_name}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.service_name}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.client_name}
                  </td>
                  <td className="p-3 text-center lg:p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones para la instrucción ${record.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(record.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </DropdownMenuItem>
                        {!isInspectorOnly ? (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar instrucción
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar instrucción
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="text-muted-foreground p-8 text-center text-sm" colSpan={5}>
                    No hay instrucciones que coincidan con la búsqueda.
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
            className="border-border bg-card space-y-3 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-card-foreground truncate text-sm font-medium">
                  {record.part_name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {record.service_name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Cliente: {record.client_name}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Acciones para la instrucción ${record.id}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewDetails(record.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalles
                  </DropdownMenuItem>
                  {!isInspectorOnly ? (
                    <>
                      <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar instrucción
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar instrucción
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {tableRows.length === 0 && (
          <CatalogEmptyState
            title={qSearch ? "Sin resultados" : "Aún no hay instrucciones"}
            description={qSearch ? "Prueba con otra pieza, servicio o cliente." : "Las instrucciones aparecerán aquí cuando se registren."}
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
        total={initialData.total}
      />

        {/* Create/Update Work Instruction Modal */}
        <WorkInstructionModal
          workInstructionId={selectedId}
          open={modalOpen}
          onOpenChange={setModalOpen}
          defaultServiceId={defaultServiceId}
        />

        {/* Work Instruction Details Modal */}
        <WorkInstructionDetailsModal
          workInstructionId={selectedId}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />
      </div>
    </PageContainer>
  );
}
