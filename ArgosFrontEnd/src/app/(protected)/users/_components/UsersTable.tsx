"use client";

import { useState, useMemo } from "react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    searchParser,
    limitParser,
    pageParser,
} from "@/app/(protected)/users/utils/parsers.client";
import { IUsersResponse, IUserRow } from "@/app/(protected)/users/types/users.types";
import UserDetailsModal from "./UserDetailsModal";
import UserEditModal from "./UserEditModal";
import {
    Search,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    Eye,
    Pencil,
    Users,
} from "lucide-react";

interface UsersTableProps {
    initialData: IUsersResponse;
    error?: string;
}

export default function UsersTable({ initialData, error }: UsersTableProps) {
    const [qSearch, setQSearch] = useQueryState("search", searchParser);
    const [qLimit, setQLimit] = useQueryState("limit", limitParser);
    const [qPage, setQPage] = useQueryState("page", pageParser);

    const [searchInput, setSearchInput] = useState(qSearch ?? "");
    const [detailsUserId, setDetailsUserId] = useState<number | null>(null);
    const [editUserId, setEditUserId] = useState<number | null>(null);

    const users = initialData.users;
    const total = initialData.total;
    const rowsPerPage = qLimit ?? 10;
    const currentPage = qPage ?? 1;
    const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

    const handleSearch = () => {
        setQSearch(searchInput || "");
        setQPage(1);
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-8 lg:px-12 py-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                    <div>
                        <h1 className="text-xl font-bold text-foreground lg:text-2xl">
                            Usuarios
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {total} usuario{total !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}

            {/* Search & Controls */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-2">
                    <Input
                        placeholder="Buscar por nombre, correo o teléfono..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="max-w-sm"
                    />
                    <Button variant="outline" size="icon" onClick={handleSearch}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <Select
                    value={String(rowsPerPage)}
                    onValueChange={(val) => {
                        setQLimit(Number(val));
                        setQPage(1);
                    }}
                >
                    <SelectTrigger className="w-[100px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Correo</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Teléfono</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Estado</th>
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 font-medium">{user.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                            {user.phone_number || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.roles ? (
                                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                                    {user.roles}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Sin rol</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    user.is_active
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {user.is_active ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setDetailsUserId(user.id)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver más
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setEditUserId(user.id)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage <= 1}
                            onClick={() => setQPage(currentPage - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage >= totalPages}
                            onClick={() => setQPage(currentPage + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            <UserDetailsModal
                userId={detailsUserId}
                open={!!detailsUserId}
                onOpenChange={(open) => !open && setDetailsUserId(null)}
            />

            {/* Edit Modal */}
            <UserEditModal
                userId={editUserId}
                open={!!editUserId}
                onOpenChange={(open) => !open && setEditUserId(null)}
            />
        </div>
    );
}
