"use client";

import { IServicesResponse } from "@/app/(protected)/services/types/services.types";
import { IClient } from "@/app/(protected)/clients/types/clients.types";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, Plus } from "lucide-react";
import ServiceModal from "./ServiceModal";
import ServiceDetailsModal from "./ServiceDetailsModal";
import { deleteService } from "@/app/(protected)/services/actions/services.actions";
import PageContainer from "@/components/layout/PageContainer";
import {
  formatDateDisplay,
  todayLocalDateString,
  toDateInputValue,
} from "@/lib/dateTimeUtils";
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
  initialData: IServicesResponse;
  clients: IClient[];
};

// Plain 'YYYY-MM-DD' string comparison - avoids Date/UTC timezone shifting.
function isEnCurso(startDate: string, endDate: string | null): boolean {
  const today = todayLocalDateString();
  const start = toDateInputValue(startDate);

  if (today < start) return false;
  if (!endDate) return true;

  const end = toDateInputValue(endDate);
  return today <= end;
}

const formatDate = formatDateDisplay;

export default function ServicesTable({ initialData, clients }: Props) {
  const { user } = useUser();
  const isInspectorOnly = hasOnlyInspectorRole(user?.roles ?? []);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedServiceId(id);
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

  // Map services to table rows
  const tableRows = useMemo(
    () =>
      (initialData.services ?? []).map((s) => ({
        id: s.id,
        client_name: s.client_name,
        en_curso: isEnCurso(s.start_date, s.end_date),
        description: s.name || "Sin descripción",
        start_date: s.start_date,
        end_date: s.end_date,
      })),
    [initialData.services]
  );

  // Pagination
  const rowsPerPage = qLimit;
  const currentPage = qPage;
  const hasMore = (initialData.services?.length ?? 0) === rowsPerPage;

  // Handlers
  const goToPage = (page: number) => {
    const target = Math.max(page, 1);
    if (target === qPage) return;
    setQPage(target);
  };

  const changeLimit = (limitStr: string) => {
    setUrlParams({ limit: Number(limitStr), page: null });
  };

  const handleUpdate = (id: number) => {
    openModal("edit", id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este servicio?")) return;
    const result = await deleteService(id);
    if (!result.success) {
      alert(result.error || "Error al eliminar servicio");
    }
  };

  const handleViewDetails = (id: number) => {
    setSelectedServiceId(id);
    setDetailsModalOpen(true);
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
      <CatalogPageHeader
        title="Servicios"
        description="Revisa el periodo de cada servicio, su cliente y las instrucciones de trabajo relacionadas."
        readOnly={isInspectorOnly}
        action={!isInspectorOnly ? (
          <Button className="w-full sm:w-auto" onClick={() => openModal("create")}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo servicio
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <CatalogSearch
        id="services-search"
        label="Buscar servicios"
        placeholder="Descripción o cliente"
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
                  Cliente
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  En Curso
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Descripción
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Fecha Inicio
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Fecha Fin
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
                    {record.client_name}
                  </td>
                  <td className="p-3 text-xs lg:p-4 lg:text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        record.en_curso
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {record.en_curso ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.description}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {formatDate(record.start_date)}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {formatDate(record.end_date)}
                  </td>
                  <td className="p-3 text-center lg:p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones para el servicio ${record.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(record.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </DropdownMenuItem>
                        {!isInspectorOnly && (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar servicio
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar servicio
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="text-muted-foreground p-8 text-center text-sm" colSpan={7}>
                    No hay servicios que coincidan con la búsqueda.
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
                <div className="flex items-center gap-2">
                  <p className="text-card-foreground text-sm font-medium">
                    #{record.id}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      record.en_curso
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {record.en_curso ? "En curso" : "Finalizado"}
                  </span>
                </div>
                <p className="text-card-foreground mt-1 text-sm">
                  {record.client_name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {record.description}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDate(record.start_date)} - {formatDate(record.end_date)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Acciones para el servicio ${record.id}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewDetails(record.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalles
                  </DropdownMenuItem>
                  {!isInspectorOnly && (
                    <>
                      <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar servicio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar servicio
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {tableRows.length === 0 && (
          <CatalogEmptyState
            title={qSearch ? "Sin resultados" : "Aún no hay servicios"}
            description={qSearch ? "Prueba con otra descripción o cliente." : "Los servicios aparecerán aquí cuando se registren."}
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

        {/* Unified Service Modal (Create/Edit) */}
        <ServiceModal
          serviceId={selectedServiceId}
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode={modalMode}
          clients={clients}
        />

        {/* Service Details Modal (View Only) */}
        <ServiceDetailsModal
          serviceId={selectedServiceId}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
        />
      </div>
    </PageContainer>
  );
}
