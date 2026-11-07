"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

async function getActiveUserId() {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    (!session.user.roles.includes(ROLES.BUYER) &&
      !session.user.roles.includes(ROLES.FARMER))
  ) {
    return null;
  }

  return session.user.id;
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
    select: { href: true },
  });

  if (!notification) {
    return;
  }

  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notificaciones");
  revalidatePath("/dashboard");
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
}
