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
