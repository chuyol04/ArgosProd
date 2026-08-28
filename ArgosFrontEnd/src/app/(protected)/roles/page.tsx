import Link from "next/link";
import { ShieldCheck, UserCog, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchRoles } from "@/app/(protected)/users/actions/users.actions";
import { fetchUsers } from "@/app/(protected)/users/data/users.data";

const ROLE_SCOPE: Record<string, string> = {
    Admin: "Acceso a la administración de usuarios, roles y archivos.",
    Manager: "Operación general y edición de inspecciones de fechas anteriores.",
    Inspector: "Registro y seguimiento operativo de inspecciones.",
    Cliente: "Consulta de solo lectura de los reportes de su cliente.",
};

export default async function RolesPage() {
    const [roles, usersResult] = await Promise.all([
        fetchRoles(),
        fetchUsers(null, 1000, 0),
    ]);
    const users = usersResult.data?.users ?? [];

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-7 w-7 text-muted-foreground" />
                    <div>
                        <h1 className="text-xl font-bold text-foreground lg:text-2xl">Roles</h1>
                        <p className="text-sm text-muted-foreground">
                            Consulta los niveles de acceso y sus usuarios asignados.
                        </p>
                    </div>
                </div>
                <Button asChild>
                    <Link href="/users">
                        <UserCog className="mr-1.5 h-4 w-4" />
                        Administrar usuarios
                    </Link>
                </Button>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                Los permisos dependen del nombre del rol. Para conservar las reglas de acceso,
                los roles se consultan aquí y se asignan desde la sección de Usuarios.
            </div>

            {usersResult.error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    No fue posible cargar los usuarios asignados: {usersResult.error}
                </div>
            )}

            {roles.length === 0 ? (
                <div className="rounded-lg border px-4 py-10 text-center text-muted-foreground">
                    No hay roles registrados o no fue posible cargarlos.
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {roles.map((role) => {
                        const assignedUsers = users.filter((user) =>
                            user.roles
                                ?.split(",")
                                .map((name) => name.trim())
                                .includes(role.name)
                        );

                        return (
                            <section key={role.id} className="rounded-lg border bg-card p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold">{role.name}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {role.description?.trim() || ROLE_SCOPE[role.name] || "Sin descripción."}
                                        </p>
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                                        <Users className="h-3.5 w-3.5" />
                                        {assignedUsers.length}
                                    </span>
                                </div>

                                <div className="mt-5 border-t pt-4">
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Usuarios asignados
                                    </p>
                                    {assignedUsers.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Ningún usuario asignado.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {assignedUsers.map((user) => (
                                                <span
                                                    key={user.id}
                                                    className="rounded-full border bg-background px-2.5 py-1 text-xs"
                                                    title={user.email}
                                                >
                                                    {user.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
