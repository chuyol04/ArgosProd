"use client";

import { IClientsResponse } from "@/app/(protected)/clients/types/clients.types";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import {
  limitParser,
  pageParser,
  searchParser,
} from "@/app/(protected)/clients/utils/parsers.client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  Plus,
} from "lucide-react";
import ClientModal from "./ClientModal";
import { deleteClient } from "@/app/(protected)/clients/actions/clients.actions";
import PageContainer from "@/components/layout/PageContainer";

type ModalMode = "create" | "edit";

type Props = {
  initialData: IClientsResponse;
};

export default function ClientsTable({ initialData }: Props) {
  const router = useRouter();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedClientId(id);
    setModalOpen(true);
  };

  // nuqs: URL state management
  const [qSearch, setQSearch] = useQueryState("search", searchParser);
  const [qLimit, setQLimit] = useQueryState("limit", limitParser);
  const [qPage, setQPage] = useQueryState("page", pageParser);

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
  const rowsPerPage = qLimit ?? 10;
  const currentPage = qPage ?? 1;
  const hasMore = (initialData.clients?.length ?? 0) === rowsPerPage;

  // Handlers
  const goToPage = (page: number) => {
    const target = Math.max(page, 1);
    if (target === (qPage ?? 1)) return;
    setQPage(target);
  };

  const changeLimit = (limitStr: string) => {
    const limit = Number(limitStr);
    setQLimit(limit);
    setQPage(1);
  };

  const onSearch = (q: string) => {
    setQSearch(q);
    setQPage(1);
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
        <div className="flex items-center justify-between">
        <h1 className="text-foreground text-xl font-bold text-balance lg:text-3xl">
          Clientes
        </h1>
        <Button onClick={() => openModal("create")}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor="search">Buscar:</Label>
            <Input
              id="search"
              placeholder="Buscar por nombre o correo..."
              className="min-w-0 flex-1"
              value={qSearch ?? ""}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

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
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Actualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(record.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Borrar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewServices(record.name)}>
                          <Building2 className="mr-2 h-4 w-4" />
                          Ver Servicios
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="text-muted-foreground p-4 text-sm" colSpan={5}>
                    No hay clientes registrados.
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
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUpdate(record.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Actualizar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(record.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Borrar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleViewServices(record.name)}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Ver Servicios
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {tableRows.length === 0 && (
          <div className="text-muted-foreground text-sm">No hay clientes registrados.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs whitespace-nowrap lg:text-sm">
              Filas por página
            </span>
            <Select value={String(rowsPerPage)} onValueChange={changeLimit}>
              <SelectTrigger className="w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-muted-foreground text-xs whitespace-nowrap lg:text-sm">
            Página {currentPage}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => goToPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!hasMore}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

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
