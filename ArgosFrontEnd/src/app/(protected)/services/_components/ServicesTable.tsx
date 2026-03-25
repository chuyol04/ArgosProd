"use client";

import { IServicesResponse } from "@/app/(protected)/services/types/services.types";
import { IClient } from "@/app/(protected)/clients/types/clients.types";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryState } from "nuqs";
import {
  limitParser,
  pageParser,
  searchParser,
} from "@/app/(protected)/services/utils/parsers.client";
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
  Eye,
  Plus,
} from "lucide-react";
import ServiceModal from "./ServiceModal";
import ServiceDetailsModal from "./ServiceDetailsModal";
import { deleteService } from "@/app/(protected)/services/actions/services.actions";
import PageContainer from "@/components/layout/PageContainer";

type ModalMode = "create" | "edit";

type Props = {
  initialData: IServicesResponse;
  clients: IClient[];
};

function isEnCurso(startDate: string, endDate: string | null): boolean {
  const now = new Date();
  const start = new Date(startDate);

  if (now < start) return false;

  if (!endDate) return true;

  const end = new Date(endDate);
  return now <= end;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ServicesTable({ initialData, clients }: Props) {
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

  // nuqs: URL state management
  const [qSearch, setQSearch] = useQueryState("search", searchParser);
  const [qLimit, setQLimit] = useQueryState("limit", limitParser);
  const [qPage, setQPage] = useQueryState("page", pageParser);

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
  const rowsPerPage = qLimit ?? 10;
  const currentPage = qPage ?? 1;
  const hasMore = (initialData.services?.length ?? 0) === rowsPerPage;

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
        <div className="flex items-center justify-between">
        <h1 className="text-foreground text-xl font-bold text-balance lg:text-3xl">
          Servicios
        </h1>
        <Button onClick={() => openModal("create")}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Servicio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
          <div className="flex w-full flex-col gap-2">
            <Label htmlFor="search">Buscar:</Label>
            <Input
              id="search"
              placeholder="Buscar por descripción o cliente..."
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
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(record.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalles
                        </DropdownMenuItem>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td className="text-muted-foreground p-4 text-sm" colSpan={7}>
                    No hay servicios registrados.
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
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewDetails(record.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver Detalles
                  </DropdownMenuItem>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
        {tableRows.length === 0 && (
          <div className="text-muted-foreground text-sm">No hay servicios registrados.</div>
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
