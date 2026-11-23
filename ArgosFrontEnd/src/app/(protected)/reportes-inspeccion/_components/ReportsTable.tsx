"use client";

import { IInspectionReportsResponse } from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
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
  Plus,
  Eye,
  Search,
  ArrowRight,
  ClipboardList,
} from "lucide-react";
import ReportModal from "./ReportModal";
import { deleteInspectionReport } from "@/app/(protected)/reportes-inspeccion/actions/reportes-inspeccion.actions";
import PageContainer from "@/components/layout/PageContainer";
import { useUser } from "@/contexts/users/userContext";
import { isInspectorOnly } from "@/lib/constants/roles";

type ModalMode = "create" | "edit" | "view";

type Props = {
  initialData: IInspectionReportsResponse;
};

export default function ReportsTable({ initialData }: Props) {
  const { user } = useUser();
  const canDelete = !isInspectorOnly(user?.roles ?? []);
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
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

  // Map reports to table rows
  const tableRows = useMemo(
    () =>
      (initialData.reports ?? []).map((report) => ({
        id: report.id,
        work_instruction_id: report.work_instruction_id,
        part_name: report.part_name,
        service_name: report.service_name,
        client_name: report.client_name,
        start_date: report.start_date,
        total_inspected_pieces: report.total_inspected_pieces ?? 0,
        total_rejected_pieces: report.total_rejected_pieces ?? 0,
      })),
    [initialData.reports]
  );

  // Pagination
  const rowsPerPage = qLimit;
  const currentPage = qPage;
  const hasMore = (initialData.reports?.length ?? 0) === rowsPerPage;

  // Handlers
  const goToPage = (page: number) => {
    const target = Math.max(page, 1);
    if (target === qPage) return;
    setQPage(target);
  };

  const changeLimit = (limitStr: string) => {
    setUrlParams({ limit: Number(limitStr), page: null });
  };

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este reporte de inspección?")) return;
    const result = await deleteInspectionReport(id);
    if (!result.success) {
      alert(result.error || "Error al eliminar reporte de inspección");
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-primary text-xs font-semibold uppercase tracking-[0.16em]">Operación</p>
            <h1 className="text-foreground text-2xl font-bold text-balance lg:text-3xl">Reportes de inspección</h1>
            <p className="text-muted-foreground max-w-2xl text-sm">Crea el reporte base y continúa con la captura de cajas, piezas y defectos.</p>
          </div>
          <Button className="w-full sm:w-auto" onClick={() => openModal("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo reporte
          </Button>
        </div>

        <div className="border-border bg-muted/30 flex items-start gap-3 rounded-lg border p-4">
          <ClipboardList className="text-primary mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Flujo de captura</p>
            <p className="text-muted-foreground text-sm">Reporte → detalle de inspección → revisión → exportación. Abre un reporte para continuar o consultar sus capturas.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="search">Buscar reportes</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Buscar por pieza, servicio o cliente..."
                  className="min-w-0 flex-1"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button type="button" variant="outline" size="icon" onClick={handleSearch} aria-label="Buscar reportes">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
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
                    IT Asociado
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                    Servicio
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">
                    Cliente
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium lg:p-4 lg:text-sm">Captura</th>
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
                      IT #{record.work_instruction_id} - {record.part_name}
                    </td>
                    <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                      {record.service_name}
                    </td>
                    <td className="text-card-foreground p-3 text-xs lg:p-4 lg:text-sm">
                      {record.client_name}
                    </td>
                    <td className="p-3 lg:p-4">
                      <p className="text-card-foreground text-xs font-medium lg:text-sm">{record.total_inspected_pieces.toLocaleString("es-MX")} inspeccionadas</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{record.total_rejected_pieces.toLocaleString("es-MX")} rechazadas</p>
                    </td>
                    <td className="p-3 text-center lg:p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openModal("view", record.id)}>Abrir<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Más acciones para el reporte ${record.id}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal("view", record.id)}><Eye className="mr-2 h-4 w-4" />Ver reporte</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openModal("edit", record.id)}><Pencil className="mr-2 h-4 w-4" />Editar reporte</DropdownMenuItem>
                            {canDelete && <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar reporte</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td className="text-muted-foreground p-8 text-center text-sm" colSpan={6}>
                      No hay reportes que coincidan con la búsqueda.
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
                    Reporte #{record.id}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    IT #{record.work_instruction_id} - {record.part_name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {record.service_name}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Cliente: {record.client_name}
                  </p>
                  <p className="text-foreground mt-3 text-xs font-medium">{record.total_inspected_pieces.toLocaleString("es-MX")} inspeccionadas · {record.total_rejected_pieces.toLocaleString("es-MX")} rechazadas</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Más acciones para el reporte ${record.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openModal("view", record.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver reporte
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModal("edit", record.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar reporte
                    </DropdownMenuItem>
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => handleDelete(record.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar reporte
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button variant="outline" className="w-full justify-between" onClick={() => openModal("view", record.id)}>
                Ver reporte y continuar<ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {tableRows.length === 0 && (
            <div className="border-border bg-muted/20 rounded-lg border border-dashed p-8 text-center">
              <p className="text-foreground text-sm font-medium">No hay reportes disponibles</p>
              <p className="text-muted-foreground mt-1 text-sm">Crea un reporte para comenzar la captura de inspección.</p>
              <Button className="mt-4" onClick={() => openModal("create")}><Plus className="mr-2 h-4 w-4" />Nuevo reporte</Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:w-auto sm:justify-start lg:gap-x-6">
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
                aria-label="Ir a la primera página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                aria-label="Ir a la página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!hasMore}
                onClick={() => goToPage(currentPage + 1)}
                aria-label="Ir a la página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Unified Report Modal */}
        <ReportModal
          reportId={selectedId}
          open={modalOpen}
          onOpenChange={setModalOpen}
          mode={modalMode}
        />
      </div>
    </PageContainer>
  );
}
