import {
  Building2,
  ClipboardList,
  Package,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const userStatusLabels = {
  ACTIVE: "Activo",
  PENDING: "Pendiente",
  SUSPENDED: "Suspendido",
  DELETED: "Eliminado",
} as const;

const animalStatusLabels = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
} as const;

const reservationStatusLabels = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  EXPIRED: "Expirada",
} as const;

const roleLabels = {
  ADMIN: "Administrador",
  FARMER: "Ganadero",
  BUYER: "Comprador",
} as const;

function formatDate(date: Date) {
  return date.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCount(
  counts: Record<string, number>,
  status: string,
) {
  return counts[status] ?? 0;
}

function getDisplayName(name: string | null | undefined) {
  return name?.trim() || "Sin nombre";
}

export default async function Admin() {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.ADMIN)
  ) {
    redirect(
      !session
        ? "/login?callbackUrl=/admin"
        : session.user.roles.includes(ROLES.FARMER)
          ? "/dashboard"
          : session.user.roles.includes(ROLES.BUYER)
            ? "/catalogo"
            : "/login",
    );
  }

  const [
    totalUsers,
    buyerUsers,
    farmerUsers,
    adminUsers,
    userStatusGroups,
    totalFincas,
    animalStatusGroups,
    reservationStatusGroups,
    totalConversations,
    recentUsers,
    recentAnimals,
    recentReservations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { roles: { some: { role: { name: ROLES.BUYER } } } },
    }),
    prisma.user.count({
      where: { roles: { some: { role: { name: ROLES.FARMER } } } },
    }),
    prisma.user.count({
      where: { roles: { some: { role: { name: ROLES.ADMIN } } } },
    }),
    prisma.user.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.finca.count(),
    prisma.animal.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.conversation.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        name: true,
        status: true,
        createdAt: true,
        roles: {
          select: { role: { select: { name: true } } },
        },
      },
    }),
    prisma.animal.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        name: true,
        identifier: true,
        status: true,
        createdAt: true,
        finca: {
          select: {
            name: true,
            owner: { select: { name: true } },
          },
        },
      },
    }),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        status: true,
        createdAt: true,
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        items: {
          take: 1,
          select: {
            animal: {
              select: {
                name: true,
                identifier: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const userCounts = Object.fromEntries(
    userStatusGroups.map(({ status, _count }) => [status, _count._all]),
  );
  const animalCounts = Object.fromEntries(
    animalStatusGroups.map(({ status, _count }) => [status, _count._all]),
  );
  const reservationCounts = Object.fromEntries(
    reservationStatusGroups.map(({ status, _count }) => [
      status,
      _count._all,
    ]),
  );
  const displayName = getDisplayName(session.user.name);
  const totalAnimals = Object.values(animalCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const totalReservations = Object.values(reservationCounts).reduce(
    (total, count) => total + count,
    0,
  );

  return (
    <DashboardShell admin userName={displayName}>
      <div>
        <p className="text-sm text-ink/45">Datos actuales de la plataforma</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold">
          Administración AgroMarketNIC
        </h2>
      </div>

      <section className="mt-8">
        <h3 className="font-display text-xl font-bold">Resumen</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Usuarios" value={totalUsers.toString()} icon={Users} />
          <StatCard label="Fincas" value={totalFincas.toString()} icon={Building2} />
          <StatCard
            label="Publicaciones"
            value={totalAnimals.toString()}
            icon={Package}
          />
          <StatCard
            label="Reservas"
            value={totalReservations.toString()}
            icon={ClipboardList}
          />
        </div>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-xl font-bold">
          Actividad de la plataforma
        </h3>
        <div className="mt-4 grid gap-6 xl:grid-cols-3">
          <section className="rounded-2xl border border-ink/10 bg-white p-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-forest" />
              <h4 className="font-display text-lg font-bold">Usuarios</h4>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <MetricRow label="Compradores" value={buyerUsers} />
              <MetricRow label="Ganaderos" value={farmerUsers} />
              <MetricRow label="Administradores" value={adminUsers} />
              <MetricRow
                label="Activos"
                value={getCount(userCounts, "ACTIVE")}
              />
              <MetricRow
                label="Pendientes"
                value={getCount(userCounts, "PENDING")}
              />
              <MetricRow
                label="Suspendidos"
                value={getCount(userCounts, "SUSPENDED")}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-forest" />
              <h4 className="font-display text-lg font-bold">Animales</h4>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <MetricRow
                label="Total"
                value={totalAnimals}
              />
              <MetricRow
                label="Disponibles"
                value={getCount(animalCounts, "AVAILABLE")}
              />
              <MetricRow
                label="Reservados"
                value={getCount(animalCounts, "RESERVED")}
              />
              <MetricRow
                label="Vendidos"
                value={getCount(animalCounts, "SOLD")}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-forest" />
              <h4 className="font-display text-lg font-bold">Reservas</h4>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <MetricRow
                label="Total"
                value={totalReservations}
              />
              <MetricRow
                label="Pendientes"
                value={getCount(reservationCounts, "PENDING")}
              />
              <MetricRow
                label="Confirmadas"
                value={getCount(reservationCounts, "CONFIRMED")}
              />
              <MetricRow
                label="Completadas"
                value={getCount(reservationCounts, "COMPLETED")}
              />
            </div>
          </section>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-ink/55">
          <ShieldCheck className="h-4 w-4 text-forest" />
          Conversaciones totales: {totalConversations}
        </p>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <RecentUsers users={recentUsers} />
        <RecentAnimals animals={recentAnimals} />
        <RecentReservations reservations={recentReservations} />
      </section>
    </DashboardShell>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/10 pb-2 last:border-0 last:pb-0">
      <span className="text-ink/60">{label}</span>
      <span className="font-bold text-ink">{value}</span>
    </div>
  );
}

function RecentUsers({
  users,
}: {
  users: Array<{
    name: string;
    status: keyof typeof userStatusLabels;
    createdAt: Date;
    roles: Array<{ role: { name: string } }>;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="flex items-center gap-3">
        <UserRound className="h-5 w-5 text-forest" />
        <h3 className="font-display text-lg font-bold">Usuarios recientes</h3>
      </div>
      <div className="mt-5 divide-y divide-ink/10">
        {users.length === 0 ? (
          <p className="text-sm text-ink/55">No hay usuarios registrados.</p>
        ) : (
          users.map((user) => (
            <div className="py-3 first:pt-0 last:pb-0" key={`${user.name}-${user.createdAt.toISOString()}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{getDisplayName(user.name)}</p>
                <Badge>{userStatusLabels[user.status]}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {user.roles
                  .map(({ role }) => roleLabels[role.name as keyof typeof roleLabels] ?? role.name)
                  .join(", ") || "Sin rol"}{" "}
                · {formatDate(user.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RecentAnimals({
  animals,
}: {
  animals: Array<{
    name: string | null;
    identifier: string | null;
    status: keyof typeof animalStatusLabels;
    createdAt: Date;
    finca: { name: string; owner: { name: string } };
  }>;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="flex items-center gap-3">
        <Package className="h-5 w-5 text-forest" />
        <h3 className="font-display text-lg font-bold">
          Publicaciones recientes
        </h3>
      </div>
      <div className="mt-5 divide-y divide-ink/10">
        {animals.length === 0 ? (
          <p className="text-sm text-ink/55">No hay publicaciones registradas.</p>
        ) : (
          animals.map((animal) => (
            <div className="py-3 first:pt-0 last:pb-0" key={`${animal.finca.name}-${animal.createdAt.toISOString()}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">
                  {getDisplayName(animal.name || animal.identifier)}
                </p>
                <Badge>{animalStatusLabels[animal.status]}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                {animal.finca.name} · {getDisplayName(animal.finca.owner.name)} ·{" "}
                {formatDate(animal.createdAt)}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function RecentReservations({
  reservations,
}: {
  reservations: Array<{
    status: keyof typeof reservationStatusLabels;
    createdAt: Date;
    buyer: { name: string };
    seller: { name: string };
    items: Array<{
      animal: { name: string | null; identifier: string | null };
    }>;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-forest" />
        <h3 className="font-display text-lg font-bold">Reservas recientes</h3>
      </div>
      <div className="mt-5 divide-y divide-ink/10">
        {reservations.length === 0 ? (
          <p className="text-sm text-ink/55">No hay reservas registradas.</p>
        ) : (
          reservations.map((reservation) => {
            const animal = reservation.items[0]?.animal;
            return (
              <div className="py-3 first:pt-0 last:pb-0" key={`${reservation.createdAt.toISOString()}-${reservation.buyer.name}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">
                    {animal
                      ? getDisplayName(animal.name || animal.identifier)
                      : "Sin animal asociado"}
                  </p>
                  <Badge>{reservationStatusLabels[reservation.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  {getDisplayName(reservation.buyer.name)} ·{" "}
                  {getDisplayName(reservation.seller.name)} ·{" "}
                  {formatDate(reservation.createdAt)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
