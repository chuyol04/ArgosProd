"use client";

import { IInspectionReportsResponse } from "@/app/(protected)/reportes-inspeccion/types/reportes-inspeccion.types";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUrlInt, useUrlString } from "@/lib/useUrlState";
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
} from "lucide-react";
import ReportModal from "./ReportModal";
import { deleteInspectionReport } from "@/app/(protected)/reportes-inspeccion/actions/reportes-inspeccion.actions";
import PageContainer from "@/components/layout/PageContainer";

type ModalMode = "create" | "edit" | "view";

type Props = {
  initialData: IInspectionReportsResponse;
};

export default function ReportsTable({ initialData }: Props) {
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [qSearch, setQSearch] = useUrlString("search");
  const [qLimit, setQLimit] = useUrlInt("limit", 10);
  const [qPage, setQPage] = useUrlInt("page", 1);

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
        po_number: report.po_number || "-",
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
    const limit = Number(limitStr);
    setQLimit(limit);
    setQPage(1);
  };

  const onSearch = (q: string) => {
    setQSearch(q);
    setQPage(1);
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
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-xl font-bold text-balance lg:text-3xl">
            Reportes de Inspección
          </h1>
          <Button onClick={() => openModal("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Reporte
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="search">Buscar:</Label>
              <Input
                id="search"
                placeholder="Buscar por pieza, servicio, cliente o PO..."
                className="min-w-0 flex-1"
                value={qSearch}
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
                    IT Asociado
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
                      IT #{record.work_instruction_id} - {record.part_name}
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
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openModal("view", record.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openModal("edit", record.id)}>
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
                    <td className="text-muted-foreground p-4 text-sm" colSpan={5}>
                      No hay reportes de inspección registrados.
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
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openModal("view", record.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openModal("edit", record.id)}>
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
            <div className="text-muted-foreground text-sm">
              No hay reportes de inspección registrados.
            </div>
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
