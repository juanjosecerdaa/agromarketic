"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { ROLES } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export type UserStatusActionState = {
  error?: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function authorizeAdmin() {
  const session = await auth();

  if (
    !session ||
    session.user.status !== "ACTIVE" ||
    !session.user.roles.includes(ROLES.ADMIN)
  ) {
    return null;
  }

  return session;
}

async function changeUserStatus(
  formData: FormData,
  operation: "suspend" | "reactivate",
): Promise<UserStatusActionState> {
  const session = await authorizeAdmin();

  if (!session) {
    return { error: "No tienes autorización para realizar esta operación." };
  }

  const userId = formData.get("userId");

  if (typeof userId !== "string" || !isUuid(userId)) {
    return { error: "La cuenta seleccionada no es válida." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      roles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });

  if (!targetUser) {
    return { error: "La cuenta seleccionada no existe." };
  }

  if (targetUser.roles.some(({ role }) => role.name === ROLES.ADMIN)) {
    return {
      error: "Las cuentas administrativas no pueden suspenderse desde esta sección.",
    };
  }

  if (operation === "suspend") {
    if (targetUser.id === session.user.id) {
      return {
        error: "No puedes suspender tu propia cuenta administrativa.",
      };
    }

    if (targetUser.status !== "ACTIVE") {
      return { error: "Solo se pueden suspender cuentas activas." };
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: "SUSPENDED" },
    });
  } else {
    if (targetUser.status !== "SUSPENDED") {
      return { error: "Solo se pueden reactivar cuentas suspendidas." };
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: "ACTIVE" },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");

  return {};
}

export async function suspendUser(
  formData: FormData,
): Promise<UserStatusActionState> {
  return changeUserStatus(formData, "suspend");
}

export async function reactivateUser(
  formData: FormData,
): Promise<UserStatusActionState> {
  return changeUserStatus(formData, "reactivate");
}
