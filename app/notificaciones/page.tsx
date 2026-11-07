import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  CircleAlert,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/app/notificaciones/actions";
import { Button } from "@/components/ui";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const notificationIcons = {
  MESSAGE: MessageCircle,
  RESERVATION_REQUEST: Bell,
  RESERVATION_CONFIRMED: CheckCircle2,
  RESERVATION_REJECTED: XCircle,
  RESERVATION_CANCELLED: XCircle,
  RESERVATION_COMPLETED: CheckCircle2,
} as const;

function formatDate(date: Date) {
  return date.toLocaleString("es-NI", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function NotificationsPage() {
  const session = await auth();

  if (!session || session.user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/notificaciones");
  }
  if (session.user.roles.includes(ROLES.ADMIN)) {
    redirect("/admin");
  }
  if (
    !session.user.roles.includes(ROLES.BUYER) &&
    !session.user.roles.includes(ROLES.FARMER)
  ) {
    redirect("/catalogo");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
  const unreadCount = notifications.filter(
    (notification) => notification.readAt === null,
  ).length;

  return (
    <main className="min-h-screen bg-cream px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">
              Centro de actividad
            </p>
            <h1 className="mt-2 font-display text-4xl font-extrabold">
              Notificaciones
            </h1>
          </div>
          {unreadCount > 0 && (
            <form action={markAllNotificationsAsRead}>
              <Button type="submit" variant="outline">
                Marcar todas como leídas
              </Button>
            </form>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-ink/20 bg-white p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-ink/35" />
            <p className="mt-4 font-display text-xl font-bold">
              No tienes notificaciones.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const content = (
                <>
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      notification.readAt
                        ? "bg-ink/10 text-ink/45"
                        : "bg-forest/10 text-forest"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{notification.title}</h2>
                      {!notification.readAt && (
                        <span className="rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white">
                          Nueva
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink/65">
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs text-ink/45">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </>
              );

              return notification.href ? (
                <form
                  key={notification.id}
                  action={markNotificationAsRead}
                  className={`rounded-2xl border p-4 ${
                    notification.readAt
                      ? "border-ink/10 bg-white/70"
                      : "border-forest/15 bg-white shadow-soft"
                  }`}
                >
                  <input
                    type="hidden"
                    name="notificationId"
                    value={notification.id}
                  />
                  <button
                    type="submit"
                    className="flex w-full items-start gap-3 text-left"
                  >
                    {content}
                    <span className="shrink-0 text-sm font-bold text-forest">
                      Ver
                    </span>
                  </button>
                </form>
              ) : (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    notification.readAt
                      ? "border-ink/10 bg-white/70"
                      : "border-forest/15 bg-white shadow-soft"
                  }`}
                >
                  {content}
                </div>
              );
            })}
          </div>
        )}
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-semibold text-forest"
        >
          Volver al marketplace
        </Link>
      </div>
    </main>
  );
}
