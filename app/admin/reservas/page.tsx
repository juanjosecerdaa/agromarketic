import Link from "next/link";
import { CalendarDays, ClipboardList, Search } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReservationStatus } from "@prisma/client";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge, Button, Input } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  EXPIRED: "Expirada",
};

const statusFilters = [
  { value: "", label: "Todos" },
  { value: "PENDING", label: "Pendientes" },
  { value: "CONFIRMED", label: "Confirmadas" },
  { value: "COMPLETED", label: "Completadas" },
  { value: "REJECTED", label: "Rechazadas" },
  { value: "CANCELLED", label: "Canceladas" },
  { value: "EXPIRED", label: "Expiradas" },
] as const;

type ReservationsPageProps = {
  searchParams: Promise<{
    estado?: string | string[];
    busqueda?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeSearch(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 100);
}

function formatPrice(value: { toString(): string } | null, currency: string) {
  if (value === null) {
    return "No disponible";
  }

  const amount = Number(value.toString());
  if (!Number.isFinite(amount)) {
    return "No disponible";
  }

  const prefix = currency === "NIO" ? "C$ " : `${currency} `;
  return `${prefix}${amount.toLocaleString("es-NI", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("es-NI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function filterHref({ status, search }: { status: string; search: string }) {
  const params = new URLSearchParams();

  if (status) {
    params.set("estado", status);
  }

  if (search) {
    params.set("busqueda", search);
  }

  const query = params.toString();
  return query ? `/admin/reservas?${query}` : "/admin/reservas";
}

function getDisplayName(name: string | null | undefined, fallback: string) {
  return name?.trim() || fallback;
}

export default async function AdminReservations({
  searchParams,
}: ReservationsPageProps) {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.ADMIN)
  ) {
    redirect(
      !session
        ? "/login?callbackUrl=/admin/reservas"
        : session.user.roles.includes(ROLES.FARMER)
          ? "/dashboard"
          : session.user.roles.includes(ROLES.BUYER)
            ? "/catalogo"
            : "/login",
    );
  }

  const params = await searchParams;
  const requestedStatus = firstParam(params.estado).toUpperCase();
  const status = statusFilters.some(
    (filter) => filter.value === requestedStatus,
  )
    ? requestedStatus
    : "";
  const search = normalizeSearch(firstParam(params.busqueda));

  const [reservations, statusGroups] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        ...(status ? { status: status as ReservationStatus } : {}),
        ...(search
          ? {
              OR: [
                { buyer: { name: { contains: search, mode: "insensitive" } } },
                { seller: { name: { contains: search, mode: "insensitive" } } },
                {
                  items: {
                    some: {
                      animal: {
                        OR: [
                          { name: { contains: search, mode: "insensitive" } },
                          {
                            identifier: {
                              contains: search,
                              mode: "insensitive",
                            },
                          },
                          {
                            finca: {
                              name: {
                                contains: search,
                                mode: "insensitive",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        message: true,
        totalAmount: true,
        currency: true,
        expiresAt: true,
        createdAt: true,
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            animal: {
              select: {
                name: true,
                identifier: true,
                finca: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const globalCounts = Object.fromEntries(
    statusGroups.map(({ status: reservationStatus, _count }) => [
      reservationStatus,
      _count._all,
    ]),
  );
  const displayName = session.user.name?.trim() || "Administrador";

  return (
    <DashboardShell admin userName={displayName}>
      <div>
        <p className="text-sm text-ink/45">Administración AgroMarketNIC</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold">Reservas</h2>
        <p className="mt-3 max-w-2xl text-ink/55">
          Supervisión de solicitudes existentes en modo solo lectura.
        </p>
      </div>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row" method="get">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 px-3 focus-within:border-leaf">
            <Search className="h-4 w-4 text-ink/40" />
            <Input
              name="busqueda"
              defaultValue={search}
              placeholder="Buscar comprador, vendedor, animal o finca..."
              className="border-0 px-0 shadow-none"
            />
          </label>
          {status && <input type="hidden" name="estado" value={status} />}
          <Button type="submit">Buscar</Button>
        </form>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
            Estado
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <Link
                href={filterHref({ status: filter.value, search })}
                key={filter.value || "all"}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  status === filter.value
                    ? "border-forest bg-forest text-white"
                    : "border-ink/10 text-ink/60 hover:border-forest/40"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryCard label="Total" value={statusGroups.reduce((total, group) => total + group._count._all, 0)} />
        {statusFilters.slice(1).map((filter) => (
          <SummaryCard
            key={filter.value}
            label={filter.label}
            value={globalCounts[filter.value] ?? 0}
          />
        ))}
      </section>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold">
            {reservations.length}{" "}
            {reservations.length === 1 ? "reserva" : "reservas"}
          </h3>
          <p className="mt-1 text-sm text-ink/50">
            Resultados ordenados por fecha de solicitud
          </p>
        </div>
        {(status || search) && (
          <Link
            href="/admin/reservas"
            className="text-sm font-semibold text-forest hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </div>

      {reservations.length > 0 ? (
        <section className="mt-4 grid gap-5 lg:grid-cols-2">
          {reservations.map((reservation, reservationIndex) => (
            <ReservationCard
              key={`${reservation.createdAt.toISOString()}-${reservationIndex}`}
              reservation={reservation}
            />
          ))}
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-ink/10 bg-white p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-forest" />
          <p className="mt-3 text-sm text-ink/55">
            No hay reservas que coincidan con los filtros seleccionados.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <p className="text-xs text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

type ReservationCardData = {
  status: ReservationStatus;
  message: string | null;
  totalAmount: { toString(): string } | null;
  currency: string;
  expiresAt: Date | null;
  createdAt: Date;
  buyer: { name: string };
  seller: { name: string };
  items: Array<{
    quantity: number;
    unitPrice: { toString(): string };
    animal: {
      name: string | null;
      identifier: string | null;
      finca: { name: string };
    };
  }>;
};

function ReservationCard({
  reservation,
}: {
  reservation: ReservationCardData;
}) {
  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div className="min-w-0">
          <h4 className="font-display text-xl font-extrabold">
            {reservation.items.length > 0
              ? reservation.items
                  .map((item) =>
                    getDisplayName(
                      item.animal.name || item.animal.identifier,
                      "Animal sin nombre",
                    ),
                  )
                  .join(" · ")
              : "Sin animal asociado"}
          </h4>
          <p className="mt-2 text-sm text-ink/55">
            Comprador: {getDisplayName(reservation.buyer.name, "Comprador")}
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Vendedor: {getDisplayName(reservation.seller.name, "Ganadero")}
          </p>
        </div>
        <Badge>{statusLabels[reservation.status]}</Badge>
      </div>

      <div className="mt-5 space-y-4 border-t border-ink/10 pt-4 text-sm">
        {reservation.items.length > 0 ? (
          <div className="space-y-3">
            {reservation.items.map((item, itemIndex) => (
              <div
                key={`${item.animal.identifier || item.animal.name || "animal"}-${itemIndex}`}
                className="rounded-xl bg-cream/70 p-3"
              >
                <p className="font-semibold text-ink">
                  {getDisplayName(
                    item.animal.name || item.animal.identifier,
                    "Animal sin nombre",
                  )}
                </p>
                <p className="mt-1 text-xs text-ink/55">
                  Finca: {getDisplayName(item.animal.finca.name, "No disponible")}
                </p>
                <div className="mt-3 grid gap-2 text-sm text-ink/60 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-ink">Cantidad:</span>{" "}
                    {item.quantity}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">
                      Precio unitario:
                    </span>{" "}
                    {formatPrice(item.unitPrice, reservation.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/55">No hay animales asociados.</p>
        )}

        <div className="grid gap-3 text-sm text-ink/60 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-ink">Total:</span>{" "}
            {formatPrice(reservation.totalAmount, reservation.currency)}
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>
              <span className="font-semibold text-ink">Solicitud:</span>{" "}
              {formatDate(reservation.createdAt)}
            </span>
          </p>
          {reservation.expiresAt && (
            <p>
              <span className="font-semibold text-ink">Vence:</span>{" "}
              {formatDate(reservation.expiresAt)}
            </p>
          )}
        </div>
      </div>

      {reservation.message?.trim() && (
        <p className="mt-4 rounded-xl bg-cream p-3 text-sm text-ink/60">
          <span className="font-semibold text-ink">Nota de la solicitud:</span>{" "}
          {reservation.message.trim()}
        </p>
      )}
    </article>
  );
}
