"use client";

import { IClientsResponse } from "@/app/(protected)/clients/types/clients.types";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Building2, Plus } from "lucide-react";
import ClientModal from "./ClientModal";
import { deleteClient } from "@/app/(protected)/clients/actions/clients.actions";
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
  initialData: IClientsResponse;
};

export default function ClientsTable({ initialData }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const isInspectorOnly = hasOnlyInspectorRole(user?.roles ?? []);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedClientId(id);
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

  // Map clients to table rows
  const tableRows = useMemo(
    () =>
      (initialData.clients ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        contact_person: c.contact_person || "Sin información",
        phone_number: c.phone_number || "Sin información",
      })),
    [initialData.clients]
  );

  // Pagination
  const rowsPerPage = qLimit;
  const currentPage = qPage;
  const hasMore = (initialData.clients?.length ?? 0) === rowsPerPage;

  // Handlers
  const goToPage = (page: number) => {
    const target = Math.max(page, 1);
    if (target === qPage) return;
    setQPage(target);
  };

  const changeLimit = (limitStr: string) => {
    const limit = Number(limitStr);
    setUrlParams({ limit, page: null });
  };

  const handleUpdate = (id: number) => {
    openModal("edit", id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este cliente?")) return;
    const result = await deleteClient(id);
    if (!result.success) {
      alert(result.error || "Error al eliminar cliente");
    }
  };

  const handleViewServices = (client: string) => {
    router.push(`/services?search=${client}`);
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
      <CatalogPageHeader
        title="Clientes"
        description="Consulta los clientes y abre los servicios asociados a cada cuenta."
        readOnly={isInspectorOnly}
        action={!isInspectorOnly ? (
          <Button className="w-full sm:w-auto" onClick={() => openModal("create")}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo cliente
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <CatalogSearch
        id="clients-search"
        label="Buscar clientes"
        placeholder="Nombre o correo"
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
                  Nombre
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Correo
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Persona de Contacto
                </th>
                <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                  Teléfono
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
                    {record.name}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.email}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.contact_person}
                  </td>
                  <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                    {record.phone_number}
                  </td>
                  <td className="p-3 text-center lg:p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Acciones para ${record.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!isInspectorOnly && (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar cliente
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleViewServices(record.name)}>
                          <Building2 className="mr-2 h-4 w-4" />
                          Ver servicios
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="text-muted-foreground p-8 text-center text-sm" colSpan={5}>
                    No hay clientes que coincidan con la búsqueda.
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
                  {record.name}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {record.email}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {record.contact_person}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {record.phone_number}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Acciones para ${record.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isInspectorOnly && (
                    <>
                      <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar cliente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar cliente
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => handleViewServices(record.name)}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Ver servicios
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {tableRows.length === 0 && (
          <CatalogEmptyState
            title={qSearch ? "Sin resultados" : "Aún no hay clientes"}
            description={qSearch ? "Prueba con otro nombre o correo." : "Los clientes aparecerán aquí cuando se registren."}
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

      {/* Unified Client Modal */}
      <ClientModal
        clientId={selectedClientId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
      />
      </div>
    </PageContainer>
  );
}
