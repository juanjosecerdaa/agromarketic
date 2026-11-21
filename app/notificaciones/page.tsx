import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  CircleAlert,
  FileSearch,
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
  FINCA_VERIFICATION_APPROVED: CheckCircle2,
  FINCA_VERIFICATION_REJECTED: CircleAlert,
  FINCA_VERIFICATION_REQUESTED: FileSearch,
} as const;

function formatDate(date: Date) {
  return date.toLocaleString("es-NI", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMessageConversationId(href: string | null) {
  const match = href?.match(
    /^\/mensajes\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i,
  );
  return match?.[1]?.toLowerCase();
}

export default async function NotificationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/notificaciones");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      status: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  const roles = user?.roles.map(({ role }) => role.name) ?? [];
  const hasAllowedRole = [ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER].some(
    (role) => roles.includes(role),
  );

  if (!user || user.status !== "ACTIVE") {
    redirect("/login?callbackUrl=/notificaciones");
  }
  if (!hasAllowedRole) {
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
  const messageConversationIds = [
    ...new Set(
      notifications
        .filter((notification) => notification.type === "MESSAGE")
        .map((notification) => getMessageConversationId(notification.href))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const messageConversations =
    messageConversationIds.length > 0
      ? await prisma.conversation.findMany({
          where: {
            id: { in: messageConversationIds },
            OR: [
              { buyerId: session.user.id },
              { sellerId: session.user.id },
            ],
          },
          select: {
            id: true,
            buyerId: true,
            buyer: { select: { name: true } },
            seller: { select: { name: true } },
            animal: {
              select: {
                finca: { select: { id: true } },
              },
            },
          },
        })
      : [];
  const messageConversationById = new Map(
    messageConversations.map((conversation) => [
      conversation.id,
      conversation,
    ]),
  );
  type NotificationRow = (typeof notifications)[number];
  const groupedMessageNotifications = new Map<string, NotificationRow[]>();
  const notificationCards: {
    notification: NotificationRow;
    messageGroup: NotificationRow[] | null;
  }[] = [];

  for (const notification of notifications) {
    const conversationId =
      notification.type === "MESSAGE" && notification.readAt === null
        ? getMessageConversationId(notification.href)
        : undefined;

    if (conversationId && messageConversationById.has(conversationId)) {
      const group = groupedMessageNotifications.get(conversationId) ?? [];
      group.push(notification);
      groupedMessageNotifications.set(conversationId, group);
    } else {
      notificationCards.push({ notification, messageGroup: null });
    }
  }

  for (const [conversationId, messageGroup] of groupedMessageNotifications) {
    const latestNotification = messageGroup[0];
    if (latestNotification) {
      notificationCards.push({ notification: latestNotification, messageGroup });
    }
  }

  notificationCards.sort(
    (left, right) =>
      right.notification.createdAt.getTime() -
      left.notification.createdAt.getTime(),
  );

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
            {notificationCards.map(({ notification, messageGroup }) => {
              const Icon = notificationIcons[notification.type];
              const conversationId =
                notification.type === "MESSAGE"
                  ? getMessageConversationId(notification.href)
                  : undefined;
              const conversation = conversationId
                ? messageConversationById.get(conversationId)
                : undefined;
              const senderName = conversation
                ? conversation.buyerId === session.user.id
                  ? conversation.seller.name.trim() || "Usuario"
                  : conversation.buyer.name.trim() || "Usuario"
                : null;
              const messageCount = messageGroup?.length ?? 0;
              const title =
                messageGroup && senderName
                  ? messageCount === 1
                    ? `Nuevo mensaje de ${senderName}`
                    : `${messageCount} mensajes nuevos de ${senderName}`
                  : notification.title;
              const message =
                messageGroup && messageCount > 0
                  ? messageCount === 1
                    ? "Abre la conversación para leerlo."
                    : "Abre la conversación para leerlos."
                  : notification.message;
              const senderProfileHref =
                conversation?.buyerId === session.user.id &&
                conversation.animal?.finca.id
                  ? `/finca/${conversation.animal.finca.id}`
                  : null;
              const verificationIconClass =
                notification.type === "FINCA_VERIFICATION_REQUESTED"
                  ? "bg-amber-100 text-amber-800"
                  : notification.type === "FINCA_VERIFICATION_APPROVED"
                    ? "bg-leaf/15 text-forest"
                    : notification.type === "FINCA_VERIFICATION_REJECTED"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-forest/10 text-forest";
              const content = (
                <>
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      notification.readAt
                        ? "bg-ink/10 text-ink/45"
                        : verificationIconClass
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-bold">{title}</h2>
                      {!notification.readAt && (
                        <span className="rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white">
                          Nueva
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink/65">
                      {message}
                    </p>
                    <p className="mt-2 text-xs text-ink/45">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </>
              );

              return notification.href ? (
                <div
                  key={notification.id}
                  className={`rounded-2xl border p-4 ${
                    notification.readAt
                      ? "border-ink/10 bg-white/70"
                      : "border-forest/15 bg-white shadow-soft"
                  }`}
                >
                  <form action={markNotificationAsRead}>
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
                      <span className="shrink-0 text-right text-sm font-bold text-forest">
                        {notification.type === "MESSAGE"
                          ? "Abrir conversación"
                          : "Ver"}
                      </span>
                    </button>
                  </form>
                  {senderProfileHref && (
                    <Link
                      href={senderProfileHref}
                      className="ml-[52px] mt-3 inline-flex text-sm font-semibold text-forest hover:underline"
                    >
                      Ver perfil del remitente
                    </Link>
                  )}
                </div>
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
          href={roles.includes(ROLES.ADMIN) ? "/admin" : "/"}
          className="mt-8 inline-block text-sm font-semibold text-forest"
        >
          {roles.includes(ROLES.ADMIN)
            ? "Volver a administración"
            : "Volver al marketplace"}
        </Link>
      </div>
    </main>
  );
}
