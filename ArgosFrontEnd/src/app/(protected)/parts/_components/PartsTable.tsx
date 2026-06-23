"use client";

import { useEffect, useMemo, useState } from "react";
import { IPartsResponse } from "@/app/(protected)/parts/types/parts.types";
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
} from "lucide-react";
import PartModal from "./PartModal";
import { deletePart } from "@/app/(protected)/parts/actions/parts.actions";
import PageContainer from "@/components/layout/PageContainer";

type ModalMode = "create" | "edit";

type Props = {
  initialData: IPartsResponse;
};

export default function PartsTable({ initialData }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

  const openModal = (mode: ModalMode, id: number | null = null) => {
    setModalMode(mode);
    setSelectedPartId(id);
    setModalOpen(true);
  };

  const [qSearch, setQSearch] = useUrlString("search");
  const [qLimit, setQLimit] = useUrlInt("limit", 10);
  const [qPage, setQPage] = useUrlInt("page", 1);

  // Local draft so typing stays instant - the URL (and the server refetch it
  // triggers) only updates after the user pauses, instead of on every keystroke.
  const [searchInput, setSearchInput] = useState(qSearch);

  useEffect(() => {
    if (searchInput === qSearch) return;
    const timeout = setTimeout(() => {
      setQSearch(searchInput);
      setQPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

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
    setQLimit(Number(limitStr));
    setQPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta pieza?")) return;
    const result = await deletePart(id);
    if (!result.success) alert(result.error || "Error al eliminar pieza");
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-xl font-bold text-balance lg:text-3xl">Piezas</h1>
          <Button onClick={() => openModal("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Pieza
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="search">Buscar:</Label>
              <Input
                id="search"
                placeholder="Buscar por nombre o descripción..."
                className="min-w-0 flex-1"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                    <td className="text-muted-foreground p-4 text-sm" colSpan={4}>
                      No hay piezas registradas.
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
            <div className="text-muted-foreground text-sm">No hay piezas registradas.</div>
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
              Página {currentPage} · {total} total
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
