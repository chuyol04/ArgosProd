"use client";

import { useState } from "react";
import { Eye, KeyRound, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { IUsersResponse } from "@/app/(protected)/users/types/users.types";
import {
    CatalogEmptyState,
    CatalogPagination,
    CatalogSearch,
} from "@/components/common/CatalogPageElements";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUrlInt, useUrlParams, useUrlString } from "@/lib/useUrlState";
import PasswordResetDialog from "./PasswordResetDialog";
import UserCreateModal from "./UserCreateModal";
import UserDetailsModal from "./UserDetailsModal";
import UserEditModal from "./UserEditModal";

interface UsersTableProps {
    initialData: IUsersResponse;
    error?: string;
}

export default function UsersTable({ initialData, error }: UsersTableProps) {
    const [qSearch] = useUrlString("search");
    const [urlLimit] = useUrlInt("limit", 10);
    const [urlPage, setQPage] = useUrlInt("page", 1);
    const setUrlParams = useUrlParams();
    const [searchInput, setSearchInput] = useState(qSearch);
    const [detailsUserId, setDetailsUserId] = useState<number | null>(null);
    const [editUserId, setEditUserId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null);

    const { users, total } = initialData;
    const qLimit = [10, 20, 50].includes(urlLimit) ? urlLimit : 10;
    const qPage = Math.max(urlPage, 1);
    const totalPages = Math.max(1, Math.ceil(total / qLimit));

    const handleSearch = () => {
        setUrlParams({ search: searchInput || null, page: null });
    };

    const renderActions = (user: (typeof users)[number]) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={`Acciones de ${user.name}`}
                >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDetailsUserId(user.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditUserId(user.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setResetTarget({ id: user.id, name: user.name })}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Restablecer contraseña
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <PageContainer className="max-w-6xl space-y-5 lg:space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-balance text-foreground lg:text-3xl">
                        Usuarios
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Administra cuentas, roles y acceso al sistema. {total} usuario{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}.
                    </p>
                </div>
                <Button className="min-h-11 w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Crear usuario
                </Button>
            </div>

            {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                    No fue posible cargar los usuarios. {error}
                </div>
            ) : null}

            <div className="rounded-lg border bg-card p-4">
                <CatalogSearch
                    id="users-search"
                    label="Buscar usuarios"
                    placeholder="Nombre, correo o teléfono"
                    value={searchInput}
                    onChange={setSearchInput}
                    onSubmit={handleSearch}
                />
            </div>

            {users.length === 0 ? (
                <CatalogEmptyState
                    title={qSearch ? "Sin coincidencias" : "No hay usuarios registrados"}
                    description={qSearch ? "Prueba con otro nombre, correo o teléfono." : "Crea el primer usuario para comenzar a asignar accesos."}
                />
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Correo</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Teléfono</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rol</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                                    <th className="w-12 px-4 py-3"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.map((user) => (
                                    <tr key={user.id} className="transition-colors hover:bg-muted/30">
                                        <td className="max-w-48 px-4 py-3 font-medium"><span className="block truncate" title={user.name}>{user.name}</span></td>
                                        <td className="max-w-64 px-4 py-3 text-muted-foreground"><span className="block truncate" title={user.email}>{user.email}</span></td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.phone_number || "—"}</td>
                                        <td className="max-w-48 px-4 py-3">
                                            {user.roles ? <span className="block truncate" title={user.roles}>{user.roles}</span> : <span className="text-muted-foreground">Sin rol</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${user.is_active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                                                {user.is_active ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1 text-right">{renderActions(user)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid gap-3 lg:hidden">
                        {users.map((user) => (
                            <article key={user.id} className="rounded-lg border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="break-words font-semibold">{user.name}</h2>
                                        <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                    {renderActions(user)}
                                </div>
                                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Rol</dt><dd className="mt-1 break-words font-medium">{user.roles || "Sin rol"}</dd></div>
                                    <div><dt className="text-xs text-muted-foreground">Estado</dt><dd className={`mt-1 font-medium ${user.is_active ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>{user.is_active ? "Activo" : "Inactivo"}</dd></div>
                                    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Teléfono</dt><dd className="mt-1 break-words">{user.phone_number || "—"}</dd></div>
                                    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Cliente</dt><dd className="mt-1 break-words">{user.client_name || "No aplica"}</dd></div>
                                </dl>
                            </article>
                        ))}
                    </div>
                </>
            )}

            {total > 0 ? (
                <div className="rounded-lg border bg-card p-3">
                    <CatalogPagination
                        rowsPerPage={qLimit}
                        currentPage={qPage}
                        hasMore={qPage < totalPages}
                        onRowsPerPageChange={(value) => setUrlParams({ limit: Number(value), page: null })}
                        onGoToPage={setQPage}
                        total={total}
                    />
                </div>
            ) : null}

            <UserCreateModal open={createOpen} onOpenChange={setCreateOpen} />
            <UserDetailsModal userId={detailsUserId} open={Boolean(detailsUserId)} onOpenChange={(open) => !open && setDetailsUserId(null)} />
            <UserEditModal userId={editUserId} open={Boolean(editUserId)} onOpenChange={(open) => !open && setEditUserId(null)} />
            <PasswordResetDialog
                userId={resetTarget?.id ?? null}
                userName={resetTarget?.name ?? ""}
                open={Boolean(resetTarget)}
                onOpenChange={(open) => !open && setResetTarget(null)}
            />
        </PageContainer>
    );
}
