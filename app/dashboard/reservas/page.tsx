import Link from "next/link";
import { ArrowLeft, CalendarDays, Package } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ReservationDecisionActions } from "@/components/reservation-decision-actions";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusLabels = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  EXPIRED: "Expirada",
} as const;

function formatPrice(value: { toString(): string }, currency: string) {
  const amount = Number(value.toString());
  if (!Number.isFinite(amount)) return "No disponible";
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

export default async function FarmerReservationsPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/dashboard/reservas");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.FARMER)) {
    redirect("/reservas");
  }

  const [reservations, finca] = await prisma.$transaction([
    prisma.reservation.findMany({
      where: { sellerId: session.user.id },
      include: {
        buyer: { select: { name: true } },
        items: {
          include: {
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
      orderBy: { createdAt: "desc" },
    }),
    prisma.finca.findFirst({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: { name: true, status: true },
    }),
  ]);

  const displayName = session.user.name?.trim() || "Ganadero";

  return (
    <DashboardShell
      userName={displayName}
      fincaName={finca?.name}
      fincaStatus={finca?.status}
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al resumen
      </Link>
      <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink/45">Gestión de solicitudes</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold">
            Reservas
          </h1>
          <p className="mt-3 text-ink/55">
            Revisa y responde las solicitudes recibidas por tus animales.
          </p>
        </div>
      </div>

      {reservations.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-leaf" />
          <h2 className="mt-4 font-display text-2xl font-extrabold">
            Aún no tienes solicitudes
          </h2>
          <p className="mt-2 text-sm text-ink/55">
            Las solicitudes de compradores aparecerán aquí.
          </p>
          <Link href="/catalogo">
            <Button className="mt-6">Ver catálogo</Button>
          </Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-5">
          {reservations.map((reservation) => {
            const item = reservation.items[0];
            const quantity = reservation.items.reduce(
              (total, reservationItem) => total + reservationItem.quantity,
              0,
            );
            const unitPrice = item
              ? formatPrice(item.unitPrice, reservation.currency)
              : "No disponible";

            return (
              <article
                key={reservation.id}
                className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <h2 className="font-display text-xl font-extrabold">
                      {item?.animal.name?.trim() ||
                        item?.animal.identifier?.trim() ||
                        "Animal sin nombre"}
                    </h2>
                    <p className="mt-1 text-sm text-ink/55">
                      Comprador: {reservation.buyer.name?.trim() || "Comprador"}
                    </p>
                    <p className="mt-1 text-sm text-ink/55">
                      Finca: {item?.animal.finca.name || "Finca no disponible"}
                    </p>
                  </div>
                  <span className="h-fit w-fit rounded-full bg-[#e1efdf] px-3 py-1 text-xs font-bold text-forest">
                    {statusLabels[reservation.status]}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 border-t border-ink/10 pt-4 text-sm text-ink/60 sm:grid-cols-4">
                  <p>
                    <span className="font-semibold text-ink">Cantidad:</span>{" "}
                    {quantity}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">
                      Precio unitario:
                    </span>{" "}
                    {unitPrice}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Total:</span>{" "}
                    {reservation.totalAmount
                      ? formatPrice(reservation.totalAmount, reservation.currency)
                      : "No disponible"}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {formatDate(reservation.createdAt)}
                  </p>
                </div>

                {reservation.message?.trim() && (
                  <p className="mt-4 rounded-xl bg-cream p-3 text-sm text-ink/60">
                    <span className="font-semibold text-ink">Nota:</span>{" "}
                    {reservation.message.trim()}
                  </p>
                )}

                {(reservation.status === "PENDING" ||
                  reservation.status === "CONFIRMED") && (
                  <ReservationDecisionActions
                    reservationId={reservation.id}
                    status={reservation.status}
                  />
                )}
              </article>
            );
          })}
        </section>
      )}
    </DashboardShell>
  );
}
