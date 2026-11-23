import Link from "next/link";
import { ShieldCheck, UserCog, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import PageContainer from "@/components/layout/PageContainer";
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
    const usersByRole = new Map<string, typeof users>();
    for (const user of users) {
        for (const roleName of user.roles?.split(",").map((name) => name.trim()) ?? []) {
            const assigned = usersByRole.get(roleName) ?? [];
            assigned.push(user);
            usersByRole.set(roleName, assigned);
        }
    }

    return (
        <PageContainer className="max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-balance text-foreground lg:text-3xl">Roles</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Consulta los niveles de acceso y las cuentas que los tienen asignados.
                    </p>
                </div>
                <Button asChild className="min-h-11 w-full sm:w-auto">
                    <Link href="/users">
                        <UserCog className="mr-1.5 h-4 w-4" />
                        Administrar usuarios
                    </Link>
                </Button>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>Los permisos dependen del nombre del rol. Los roles se consultan aquí y se asignan desde Usuarios.</p>
            </div>

            {usersResult.error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
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
                        const assignedUsers = usersByRole.get(role.name) ?? [];

                        return (
                            <section key={role.id} className="rounded-lg border bg-card p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-semibold">{role.name}</h2>
                                        <p className="mt-1 break-words text-sm text-muted-foreground">
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
                                            {assignedUsers.slice(0, 8).map((user) => (
                                                <span
                                                    key={user.id}
                                                    className="max-w-full truncate rounded-full border bg-background px-2.5 py-1 text-xs"
                                                    title={user.email}
                                                >
                                                    {user.name}
                                                </span>
                                            ))}
                                            {assignedUsers.length > 8 ? (
                                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                                    +{assignedUsers.length - 8} más
                                                </span>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </PageContainer>
    );
}
