import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChartNoAxesCombined,
  Eye,
  MessageCircle,
  Package,
  Plus,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=900&q=80";

const fincaStatusLabels = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  VERIFIED: "Verificada",
} as const;

const animalStatusLabels = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  INACTIVE: "Inactivo",
} as const;

const notificationIcons = {
  MESSAGE: MessageCircle,
  RESERVATION_REQUEST: Bell,
  RESERVATION_CONFIRMED: CheckCircle2,
  RESERVATION_REJECTED: XCircle,
  RESERVATION_CANCELLED: XCircle,
  RESERVATION_COMPLETED: CheckCircle2,
} as const;

function formatPrice(value: { toString(): string }, currency: string) {
  const amount = Number(value.toString());

  if (!Number.isFinite(amount)) {
    return "Precio no disponible";
  }

  const prefix = currency === "NIO" ? "C$ " : `${currency} `;
  return `${prefix}${amount.toLocaleString("es-NI", {
    maximumFractionDigits: 2,
  })}`;
}

export default async function Dashboard() {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    (!session.user.roles.includes(ROLES.FARMER) &&
      !session.user.roles.includes(ROLES.ADMIN))
  ) {
    redirect(
      !session
        ? "/login?callbackUrl=/dashboard"
        : session.user.roles.includes(ROLES.BUYER)
          ? "/catalogo"
          : "/login",
    );
  }

  const isAdmin = session.user.roles.includes(ROLES.ADMIN);
  const [
    fincas,
    conversationsReceived,
    completedReservations,
    pendingReservationCount,
    unreadCount,
    profileVisitCount,
    recentNotifications,
    publicationStatusCounts,
  ] =
    await prisma.$transaction([
      prisma.finca.findMany({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: {
          name: true,
          status: true,
          animals: {
            where: { status: { not: "INACTIVE" } },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              identifier: true,
              price: true,
              currency: true,
              status: true,
              category: { select: { name: true } },
              images: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      }),
      prisma.conversation.count({
        where: { sellerId: session.user.id },
      }),
      prisma.reservation.count({
        where: {
          sellerId: session.user.id,
          status: "COMPLETED",
        },
      }),
      prisma.reservation.count({
        where: {
          sellerId: session.user.id,
          status: "PENDING",
        },
      }),
      prisma.message.count({
        where: {
          recipientId: session.user.id,
          readAt: null,
        },
      }),
      prisma.profileVisit.count({
        where: {
          finca: { ownerId: session.user.id },
        },
      }),
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          href: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.animal.groupBy({
        by: ["status"],
        where: {
          finca: { ownerId: session.user.id },
        },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
    ]);

  const finca = fincas[0];
  const animals = fincas.flatMap(({ animals: fincaAnimals }) => fincaAnimals);
  const publicationCounts = {
    AVAILABLE: 0,
    RESERVED: 0,
    SOLD: 0,
    INACTIVE: 0,
  };
  for (const group of publicationStatusCounts) {
    if (group._count && typeof group._count !== "boolean") {
      publicationCounts[group.status] = group._count._all ?? 0;
    }
  }
  const displayName = session.user.name?.trim() || session.user.email || "Usuario";
  const fincaStatus = finca ? fincaStatusLabels[finca.status] : null;

  return (
    <DashboardShell
      userName={displayName}
      fincaName={finca?.name}
      fincaStatus={finca?.status}
      unreadCount={unreadCount}
      pendingReservationCount={pendingReservationCount}
      admin={isAdmin}
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink/45">Resumen de tu cuenta</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold">
            {finca
              ? "Tu operación, en un vistazo"
              : isAdmin
                ? "Sin fincas asociadas"
                : "Configura tu finca"}
          </h2>
        </div>
        {finca && (
          <Link href="/dashboard/animales/nuevo">
            <Button>
              <Plus className="h-4 w-4" /> Publicar animal
            </Button>
          </Link>
        )}
      </div>

      {!finca ? (
        <section className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center sm:p-12">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f0df] text-forest">
            <Package className="h-7 w-7" />
          </div>
          <h3 className="mt-5 font-display text-2xl font-extrabold">
            {isAdmin ? "No hay recursos ganaderos asociados" : "Registra tu primera finca"}
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-ink/55">
            {isAdmin
              ? "Este dashboard muestra únicamente recursos cuyo propietario sea el usuario autenticado."
              : "Para comenzar a publicar animales en AgroMarketNIC, primero registra la información de tu finca."}
          </p>
          {!isAdmin && (
            <Link href="/dashboard/finca">
              <Button className="mt-6">Registrar mi finca</Button>
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Animales publicados"
              value={animals.length.toString()}
              icon={Package}
            />
            <StatCard
              label="Consultas recibidas"
              value={conversationsReceived.toString()}
              icon={MessageCircle}
            />
            <StatCard
              label="Visitas al perfil"
              value={profileVisitCount.toString()}
              icon={Eye}
            />
            <StatCard
              label="Reservas completadas"
              value={completedReservations.toString()}
              icon={TrendingUp}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-ink/10 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold">
                    Actividad reciente
                  </h3>
                  <p className="mt-1 text-sm text-ink/50">
                    Últimas actualizaciones de tu cuenta
                  </p>
                </div>
                <Bell className="h-5 w-5 text-leaf" />
              </div>
              {recentNotifications.length > 0 ? (
                <div className="mt-5 divide-y divide-ink/10">
                  {recentNotifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    const item = (
                      <>
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                            notification.readAt
                              ? "bg-ink/10 text-ink/45"
                              : "bg-forest/10 text-forest"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">
                              {notification.title}
                            </p>
                            {!notification.readAt && (
                              <span className="rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white">
                                Nueva
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm text-ink/55">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-ink/40">
                            {notification.createdAt.toLocaleString("es-NI", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </>
                    );

                    return notification.href ? (
                      <Link
                        key={notification.id}
                        href={notification.href}
                        className="flex items-start gap-3 py-4 first:pt-0 last:pb-0 hover:bg-cream/50"
                      >
                        {item}
                      </Link>
                    ) : (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        {item}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/55">
                  No tienes actividad reciente.
                </p>
              )}
              <Link
                href="/notificaciones"
                className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-forest"
              >
                Ver todas las notificaciones <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <section className="rounded-2xl border border-ink/10 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-bold">
                    Estado de publicaciones
                  </h3>
                  <p className="mt-1 text-sm text-ink/50">
                    Conteos actuales de tus fincas
                  </p>
                </div>
                <ChartNoAxesCombined className="h-5 w-5 text-leaf" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  ["Disponibles", publicationCounts.AVAILABLE],
                  ["Reservados", publicationCounts.RESERVED],
                  ["Vendidos", publicationCounts.SOLD],
                  ["Inactivos", publicationCounts.INACTIVE],
                ].map(([label, count]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl bg-cream px-4 py-3"
                  >
                    <span className="text-sm text-ink/60">{label}</span>
                    <b className="font-display text-xl text-forest">{count}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">
                  Tus publicaciones activas
                </h3>
                <p className="mt-1 text-sm text-ink/50">
                  Animales asociados exclusivamente a tus fincas
                </p>
              </div>
              <Link
                href="/dashboard/animales"
                className="flex items-center gap-1 text-sm font-bold text-forest"
              >
                Gestionar <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {animals.length > 0 ? (
              <div className="mt-5 divide-y divide-ink/10">
                {animals.slice(0, 3).map((animal) => (
                  <div className="flex items-center gap-4 py-4" key={animal.id}>
                    <img
                      src={animal.images[0]?.url || FALLBACK_IMAGE}
                      alt=""
                      className="h-14 w-16 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">
                        {animal.name?.trim() ||
                          animal.identifier?.trim() ||
                          "Animal sin nombre"}
                      </p>
                      <p className="mt-1 text-xs text-ink/45">
                        {animal.category.name} ·{" "}
                        {animalStatusLabels[animal.status]}
                      </p>
                    </div>
                    <span className="hidden text-sm font-bold text-forest sm:block">
                      {formatPrice(animal.price, animal.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-cream p-5 text-sm text-ink/55">
                Aún no tienes animales publicados en tus fincas.
              </p>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}
