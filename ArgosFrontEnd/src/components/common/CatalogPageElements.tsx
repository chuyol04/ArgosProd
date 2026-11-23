"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, LockKeyhole, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

type CatalogPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  readOnly?: boolean;
};

export function CatalogPageHeader({
  title,
  description,
  action,
  readOnly = false,
}: CatalogPageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-primary text-xs font-semibold uppercase tracking-[0.16em]">Catálogo</p>
          <h1 className="text-foreground text-2xl font-bold text-balance lg:text-3xl">{title}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      {readOnly ? (
        <div className="border-border bg-muted/30 flex items-start gap-3 rounded-lg border p-4" role="status">
          <LockKeyhole className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            Vista de consulta. El rol Inspector no puede crear, editar ni eliminar registros de este catálogo.
          </p>
        </div>
      ) : null}
    </div>
  );
}

type CatalogSearchProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function CatalogSearch({
  id,
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
}: CatalogSearchProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          type="search"
          placeholder={placeholder}
          className="min-w-0 flex-1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onSubmit()}
        />
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onSubmit} aria-label={label}>
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

type CatalogEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function CatalogEmptyState({ title, description, action }: CatalogEmptyStateProps) {
  return (
    <div className="border-border bg-muted/20 rounded-lg border border-dashed p-8 text-center">
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

type CatalogPaginationProps = {
  rowsPerPage: number;
  currentPage: number;
  hasMore: boolean;
  onRowsPerPageChange: (value: string) => void;
  onGoToPage: (page: number) => void;
  total?: number;
  pageSizeOptions?: number[];
};

export function CatalogPagination({
  rowsPerPage,
  currentPage,
  hasMore,
  onRowsPerPageChange,
  onGoToPage,
  total,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: CatalogPaginationProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
      <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:w-auto sm:justify-start lg:gap-x-6">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs whitespace-nowrap lg:text-sm">Filas por página</span>
          <Select value={String(rowsPerPage)} onValueChange={onRowsPerPageChange}>
            <SelectTrigger className="w-[4.5rem]" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground text-xs whitespace-nowrap lg:text-sm">
          Página {currentPage}{typeof total === "number" ? ` · ${total} total` : ""}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-11 w-11" disabled={currentPage <= 1} onClick={() => onGoToPage(1)} aria-label="Ir a la primera página">
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11" disabled={currentPage <= 1} onClick={() => onGoToPage(currentPage - 1)} aria-label="Ir a la página anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11" disabled={!hasMore} onClick={() => onGoToPage(currentPage + 1)} aria-label="Ir a la página siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
