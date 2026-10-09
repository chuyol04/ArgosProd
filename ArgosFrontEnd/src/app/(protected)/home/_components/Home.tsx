'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Download,
    FileImage,
    FileText,
    PackageSearch,
    SearchCheck,
    ShieldCheck,
    UserCog,
    Users,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import Category from '@/app/(protected)/sitemap/_components/Category';
import { toggleFavoriteRoute } from '@/app/(protected)/favorite-routes/actions/favorite-routes.actions';
import { getFavoriteRoutes } from '@/app/(protected)/favorite-routes/data/favorite-routes.data';
import { sitemapData } from '@/app/(protected)/sitemap/data/sitemapData';
import { ICategoryData } from '@/app/(protected)/sitemap/types/sitemap.types';
import { useUser } from '@/contexts/users/userContext';

interface IQuickAccessItem {
    title: string;
    description: string;
    path: string;
    icon: LucideIcon;
    adminOnly?: boolean;
}

const WORKFLOW_ITEMS = [
    { title: 'Reporte', icon: FileText, path: '/reportes-inspeccion' },
    { title: 'Detalle', icon: ClipboardList, path: '/detalles-inspeccion/crear' },
    { title: 'Revisión', icon: SearchCheck, path: '/reportes-inspeccion' },
    { title: 'Resultado', icon: CheckCircle2, path: '/reportes-inspeccion' },
    { title: 'Excel', icon: Download, path: '/reportes-inspeccion' },
];

const QUICK_ACCESS_ITEMS: IQuickAccessItem[] = [
    {
        title: 'Reportes de inspección',
        description: 'Crear, consultar y dar seguimiento a reportes.',
        path: '/reportes-inspeccion',
        icon: FileText,
    },
    {
        title: 'Detalles de inspección',
        description: 'Capturar cajas, piezas, rechazos y defectos.',
        path: '/detalles-inspeccion/crear',
        icon: ClipboardCheck,
    },
    {
        title: 'Clientes',
        description: 'Alta y consulta del catálogo de clientes.',
        path: '/clients',
        icon: Users,
    },
    {
        title: 'Servicios',
        description: 'Servicios asociados a cada cliente.',
        path: '/services',
        icon: BriefcaseBusiness,
    },
    {
        title: 'Piezas',
        description: 'Consulta y administración del catálogo de piezas.',
        path: '/parts',
        icon: Wrench,
    },
    {
        title: 'Defectos',
        description: 'Consulta y administración del catálogo de defectos.',
        path: '/defects',
        icon: AlertTriangle,
    },
    {
        title: 'Instrucciones de trabajo',
        description: 'Documentos e instrucciones para cada operación.',
        path: '/instrucciones-trabajo',
        icon: PackageSearch,
    },
    {
        title: 'Usuarios',
        description: 'Administración de cuentas de usuario.',
        path: '/users',
        icon: UserCog,
        adminOnly: true,
    },
    {
        title: 'Roles',
        description: 'Administración de roles y accesos.',
        path: '/roles',
        icon: ShieldCheck,
        adminOnly: true,
    },
    {
        title: 'Archivos y evidencias',
        description: 'Administración de archivos del sistema.',
        path: '/media',
        icon: FileImage,
        adminOnly: true,
    },
];

function QuickAccessCard({ item }: { item: IQuickAccessItem }) {
    const Icon = item.icon;

    return (
        <Link
            href={item.path}
            className="group flex min-h-32 items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
        >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 font-semibold text-slate-900">
                    {item.title}
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-500" />
                </span>
                <span className="mt-2 block text-sm leading-5 text-slate-500">
                    {item.description}
                </span>
            </span>
        </Link>
    );
}

export default function Home() {
    const { user } = useUser();
    const [favoriteRouteIds, setFavoriteRouteIds] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!user) return;

        getFavoriteRoutes()
            .then((favorites) => setFavoriteRouteIds(favorites.map((favorite) => favorite.route_id)))
            .catch((error) => console.error('Failed to load favorite routes:', error));
    }, [user]);

    const isAdmin = user?.roles?.includes('Admin') ?? false;

    const visibleQuickAccessItems = useMemo(
        () => QUICK_ACCESS_ITEMS.filter((item) => !item.adminOnly || isAdmin),
        [isAdmin]
    );

    const favoritesByCategory = useMemo(() => {
        if (!user) return [];

        return sitemapData.reduce<ICategoryData[]>((categories, category) => {
            const routes = category.routes.filter((route) =>
                favoriteRouteIds.includes(route.path)
            );

            if (routes.length > 0) categories.push({ name: category.name, routes });
            return categories;
        }, []);
    }, [favoriteRouteIds, user]);

    const handleRemoveFavorite = (routeId: string) => {
        setFavoriteRouteIds((current) => current.filter((id) => id !== routeId));

        startTransition(async () => {
            const result = await toggleFavoriteRoute(routeId);
            if (!result.success) {
                setFavoriteRouteIds((current) => [...current, routeId]);
                console.error('Failed to remove favorite:', result.error);
            }
        });
    };

    if (!user) return null;

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <section className="grid min-h-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
                <div className="flex flex-col justify-center p-7 sm:p-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                        Panel administrativo
                    </p>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                        Bienvenida, {user.name}
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                        Supervisa la operación y continúa el flujo de inspección desde un solo lugar.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/reportes-inspeccion"
                            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
                        >
                            <ClipboardCheck className="h-4 w-4" />
                            Nueva inspección
                        </Link>
                        <Link
                            href="/reportes-inspeccion"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            Ver reportes
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
                <div className="relative aspect-[1917/821] bg-slate-900 lg:aspect-auto lg:min-h-full">
                    <Image
                        src="/images/bannerozcabinspeccion.png"
                        alt="Equipo de inspección de OZCAB"
                        fill
                        sizes="(min-width: 1024px) 55vw, 100vw"
                        className="object-contain lg:object-cover lg:object-center"
                        priority
                    />
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">
                        Flujo operativo
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-950">
                        De la captura al resultado
                    </h2>
                </div>
                <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-2 lg:grid-cols-5">
                    {WORKFLOW_ITEMS.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.title}
                                href={item.path}
                                className="group relative flex items-center gap-3 border-b border-slate-200 p-4 last:border-b-0 hover:bg-orange-50 sm:border-r lg:border-b-0"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 group-hover:bg-orange-500 group-hover:text-white">
                                    {index + 1}
                                </span>
                                <span>
                                    <Icon className="mb-1 h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-semibold text-slate-800">{item.title}</span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </section>

            <section>
                <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-600">
                            Accesos rápidos
                        </p>
                        <h2 className="mt-1 text-2xl font-bold text-slate-950">
                            Herramientas de administración
                        </h2>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleQuickAccessItems.map((item) => (
                        <QuickAccessCard key={item.path} item={item} />
                    ))}
                </div>
            </section>

            {favoritesByCategory.length > 0 && (
                <section className={isPending ? 'pointer-events-none opacity-70' : ''}>
                    <h2 className="mb-4 text-2xl font-bold text-slate-950">Favoritos</h2>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        {favoritesByCategory.map((category) => (
                            <Category
                                key={category.name}
                                name={category.name}
                                routes={category.routes}
                                favorites={favoriteRouteIds}
                                onToggleFavorite={handleRemoveFavorite}
                                showStars
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
