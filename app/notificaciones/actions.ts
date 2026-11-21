"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

async function getActiveUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      status: true,
      roles: { select: { role: { select: { name: true } } } },
    },
  });
  const roles = user?.roles.map(({ role }) => role.name) ?? [];

  if (
    !user ||
    user.status !== "ACTIVE" ||
    ![ROLES.ADMIN, ROLES.BUYER, ROLES.FARMER].some((role) =>
      roles.includes(role),
    )
  ) {
    return null;
  }

  return user.id;
}

function getMessageConversationId(href: string | null) {
  const match = href?.match(
    /^\/mensajes\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i,
  );
  return match?.[1]?.toLowerCase();
}

export async function markNotificationAsRead(formData: FormData) {
  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string" || !notificationId.trim()) {
    return;
  }

  const userId = await getActiveUserId();
  if (!userId) {
    redirect("/login?callbackUrl=/notificaciones");
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { href: true, type: true, readAt: true },
  });

  if (!notification) {
    return;
  }

  const conversationId =
    notification.type === "MESSAGE" && notification.readAt === null
      ? getMessageConversationId(notification.href)
      : undefined;
  const conversation =
    conversationId && notification.href
      ? await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [{ buyerId: userId }, { sellerId: userId }],
          },
          select: { id: true },
        })
      : null;

  await prisma.notification.updateMany({
    where:
      conversation && notification.href
        ? {
            userId,
            type: "MESSAGE",
            href: notification.href,
            readAt: null,
          }
        : { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notificaciones");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/mensajes");

  if (notification.href) {
    redirect(notification.href);
  }
}

export async function markAllNotificationsAsRead() {
  const userId = await getActiveUserId();
  if (!userId) {
    redirect("/login?callbackUrl=/notificaciones");
  }

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notificaciones");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}
