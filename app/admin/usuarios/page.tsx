import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import type { UserStatus } from "@prisma/client";

import { auth } from "@/auth";
import { AdminUserAction } from "@/components/admin-user-action";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Input } from "@/components/ui";
import { ROLES, type RoleName } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<RoleName, string> = {
  BUYER: "Comprador",
  FARMER: "Ganadero",
  ADMIN: "Administrador",
};

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  SUSPENDED: "Suspendido",
  DELETED: "Eliminado",
};

const roleFilters = [
  { value: "", label: "Todos" },
  { value: ROLES.BUYER, label: "Compradores" },
  { value: ROLES.FARMER, label: "Ganaderos" },
  { value: ROLES.ADMIN, label: "Administradores" },
] as const;

const statusFilters = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "SUSPENDED", label: "Suspendidos" },
] as const;

type UsersPageProps = {
  searchParams: Promise<{
    rol?: string | string[];
    estado?: string | string[];
    busqueda?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getDisplayName(name: string | null | undefined) {
  return name?.trim() || "Sin nombre";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filterHref({
  role,
  status,
  search,
}: {
  role: string;
  status: string;
  search: string;
}) {
  const params = new URLSearchParams();

  if (role) {
    params.set("rol", role);
  }

  if (status) {
    params.set("estado", status);
  }

  if (search) {
    params.set("busqueda", search);
  }

  const query = params.toString();
  return query ? `/admin/usuarios?${query}` : "/admin/usuarios";
}

export default async function AdminUsers({ searchParams }: UsersPageProps) {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.ADMIN)
  ) {
    redirect(
      !session
        ? "/login?callbackUrl=/admin/usuarios"
        : session.user.roles.includes(ROLES.FARMER)
          ? "/dashboard"
          : session.user.roles.includes(ROLES.BUYER)
            ? "/catalogo"
            : "/login",
    );
  }

  const params = await searchParams;
  const requestedRole = firstParam(params.rol).toUpperCase();
  const requestedStatus = firstParam(params.estado).toUpperCase();
  const role = roleFilters.some((filter) => filter.value === requestedRole)
    ? requestedRole
    : "";
  const status = statusFilters.some((filter) => filter.value === requestedStatus)
    ? requestedStatus
    : "";
  const search = firstParam(params.busqueda).trim().slice(0, 100);

  const users = await prisma.user.findMany({
    where: {
      ...(role
        ? {
            roles: {
              some: {
                role: { name: role },
              },
            },
          }
        : {}),
      ...(status ? { status: status as UserStatus } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      createdAt: true,
      roles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
      _count: {
        select: {
          finca: true,
          reservationsAsBuyer: true,
          reservationsAsSeller: true,
        },
      },
      finca: {
        select: {
          _count: {
            select: { animals: true },
          },
        },
      },
    },
  });

  return (
    <DashboardShell admin userName={session.user.name || undefined}>
      <div>
        <p className="text-sm text-ink/45">Administración AgroMarketNIC</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold">Usuarios</h2>
      </div>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3 focus-within:border-leaf">
            <Search className="h-4 w-4 text-ink/40" />
            <Input
              name="busqueda"
              defaultValue={search}
              placeholder="Buscar por nombre o correo..."
              className="border-0 px-0 shadow-none"
            />
          </label>
          {role && <input type="hidden" name="rol" value={role} />}
          {status && <input type="hidden" name="estado" value={status} />}
          <Button type="submit">Buscar</Button>
        </form>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <FilterGroup
            label="Rol"
            filters={roleFilters}
            selected={role}
            status={status}
            search={search}
            queryKey="role"
          />
          <FilterGroup
            label="Estado"
            filters={statusFilters}
            selected={status}
            role={role}
            search={search}
            queryKey="status"
          />
        </div>
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold">
            {users.length} {users.length === 1 ? "usuario" : "usuarios"}
          </h3>
          <p className="mt-1 text-sm text-ink/50">
            Consulta de cuentas registradas en AgroMarketNIC
          </p>
        </div>
        {(role || status || search) && (
          <Link
            href="/admin/usuarios"
            className="text-sm font-semibold text-forest hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 bg-cream/60 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-5 py-4 font-bold">Usuario</th>
                <th className="px-5 py-4 font-bold">Rol</th>
                <th className="px-5 py-4 font-bold">Estado</th>
                <th className="px-5 py-4 font-bold">Fincas</th>
                <th className="px-5 py-4 font-bold">Publicaciones</th>
                <th className="px-5 py-4 font-bold">Reservas</th>
                <th className="px-5 py-4 font-bold">Registro</th>
                <th className="px-5 py-4 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {users.map((user) => (
                <UserTableRow
                  key={`${user.email}-${user.createdAt.toISOString()}`}
                  user={user}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-ink/10 md:hidden">
          {users.map((user) => (
            <UserCard key={`${user.email}-${user.createdAt.toISOString()}`} user={user} />
          ))}
        </div>

        {users.length === 0 && (
          <p className="p-8 text-center text-sm text-ink/55">
            No hay usuarios que coincidan con los filtros seleccionados.
          </p>
        )}
      </section>
    </DashboardShell>
  );
}

type UserRow = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  roles: Array<{ role: { name: string } }>;
  _count: {
    finca: number;
    reservationsAsBuyer: number;
    reservationsAsSeller: number;
  };
  finca: Array<{ _count: { animals: number } }>;
};

function getUserCounts(user: UserRow) {
  return {
    farms: user._count.finca,
    animals: user.finca.reduce((total, finca) => total + finca._count.animals, 0),
    buyerReservations: user._count.reservationsAsBuyer,
    sellerReservations: user._count.reservationsAsSeller,
  };
}

function RoleBadges({ user }: { user: UserRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {user.roles.map(({ role }) => (
        <Badge key={role.name}>
          {roleLabels[role.name as RoleName] ?? role.name}
        </Badge>
      ))}
    </div>
  );
}

function UserIdentity({ user }: { user: UserRow }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e5f0df] text-forest">
        <UserRound className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{getDisplayName(user.name)}</p>
        <p className="truncate text-xs text-ink/50">{user.email}</p>
      </div>
    </div>
  );
}

function UserTableRow({ user }: { user: UserRow }) {
  const counts = getUserCounts(user);

  return (
    <tr>
      <td className="px-5 py-4">
        <UserIdentity user={user} />
      </td>
      <td className="px-5 py-4">
        <RoleBadges user={user} />
      </td>
      <td className="px-5 py-4">
        <Badge>{statusLabels[user.status]}</Badge>
      </td>
      <td className="px-5 py-4">{counts.farms}</td>
      <td className="px-5 py-4">{counts.animals}</td>
      <td className="px-5 py-4 text-xs text-ink/60">
        <div>Comprador: {counts.buyerReservations}</div>
        <div>Vendedor: {counts.sellerReservations}</div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-ink/60">
        {formatDate(user.createdAt)}
      </td>
      <td className="px-5 py-4">
        <UserAction user={user} />
      </td>
    </tr>
  );
}

function UserCard({ user }: { user: UserRow }) {
  const counts = getUserCounts(user);

  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        <Badge>{statusLabels[user.status]}</Badge>
      </div>
      <div className="mt-4">
        <RoleBadges user={user} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-ink/60">
        <div>
          <dt>Fincas</dt>
          <dd className="font-bold text-ink">{counts.farms}</dd>
        </div>
        <div>
          <dt>Publicaciones</dt>
          <dd className="font-bold text-ink">{counts.animals}</dd>
        </div>
        <div>
          <dt>Reservas como comprador</dt>
          <dd className="font-bold text-ink">{counts.buyerReservations}</dd>
        </div>
        <div>
          <dt>Reservas como vendedor</dt>
          <dd className="font-bold text-ink">{counts.sellerReservations}</dd>
        </div>
        <div>
          <dt>Registro</dt>
          <dd className="font-bold text-ink">{formatDate(user.createdAt)}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-ink/10 pt-4">
        <UserAction user={user} />
      </div>
    </article>
  );
}

function UserAction({ user }: { user: UserRow }) {
  const isAdmin = user.roles.some(({ role }) => role.name === ROLES.ADMIN);

  if (isAdmin) {
    return <span className="text-xs font-semibold text-ink/50">Cuenta administrativa</span>;
  }

  if (user.status === "ACTIVE") {
    return <AdminUserAction userId={user.id} operation="suspend" />;
  }

  if (user.status === "SUSPENDED") {
    return <AdminUserAction userId={user.id} operation="reactivate" />;
  }

  return <span className="text-xs font-semibold text-ink/50">Sin acciones disponibles</span>;
}

function FilterGroup({
  label,
  filters,
  selected,
  role = "",
  status = "",
  search,
  queryKey,
}: {
  label: string;
  filters: readonly { value: string; label: string }[];
  selected: string;
  role?: string;
  status?: string;
  search: string;
  queryKey: "role" | "status";
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const nextRole =
            queryKey === "role" ? filter.value : role;
          const nextStatus =
            queryKey === "status" ? filter.value : status;

          return (
            <Link
              href={filterHref({
                role: nextRole,
                status: nextStatus,
                search,
              })}
              key={filter.label}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                selected === filter.value
                  ? "border-forest bg-forest text-white"
                  : "border-ink/10 text-ink/60 hover:border-forest/40"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
