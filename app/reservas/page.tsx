import Link from "next/link";
import { ArrowLeft, CalendarDays, Package } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
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
  if (!Number.isFinite(amount)) return "Total no disponible";
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

export default async function ReservationsPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/reservas");
  }

  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }

  if (!session.user.roles.includes(ROLES.BUYER)) {
    redirect("/dashboard");
  }

  const reservations = await prisma.reservation.findMany({
    where: { buyerId: session.user.id },
    include: {
      seller: { select: { name: true } },
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
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
        <Link
          href="/catalogo"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-forest"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>
        <h1 className="mt-7 font-display text-4xl font-extrabold">
          Mis reservas
        </h1>
        <p className="mt-3 text-ink/55">
          Solicitudes realizadas desde tus publicaciones consultadas.
        </p>

        {reservations.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-leaf" />
            <h2 className="mt-4 font-display text-2xl font-extrabold">
              Aún no tienes reservas
            </h2>
            <p className="mt-2 text-sm text-ink/55">
              Tus solicitudes aparecerán aquí.
            </p>
            <Link href="/catalogo">
              <Button className="mt-6">Explorar catálogo</Button>
            </Link>
          </section>
        ) : (
          <section className="mt-8 grid gap-5">
            {reservations.map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <p className="text-sm font-semibold text-ink/50">
                      Propietario:{" "}
                      {reservation.seller.name?.trim() || "Ganadero"}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-extrabold">
                      {reservation.items[0]?.animal.name?.trim() ||
                        reservation.items[0]?.animal.identifier?.trim() ||
                        "Animal sin nombre"}
                    </h2>
                    <p className="mt-1 text-sm text-ink/55">
                      Finca:{" "}
                      {reservation.items[0]?.animal.finca.name ||
                        "Finca no disponible"}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-[#e1efdf] px-3 py-1 text-xs font-bold text-forest">
                    {statusLabels[reservation.status]}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 border-t border-ink/10 pt-4 text-sm text-ink/60 sm:grid-cols-3">
                  <p>
                    <span className="font-semibold text-ink">Cantidad:</span>{" "}
                    {reservation.items.reduce(
                      (total, item) => total + item.quantity,
                      0,
                    )}
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
                    Nota: {reservation.message.trim()}
                  </p>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
